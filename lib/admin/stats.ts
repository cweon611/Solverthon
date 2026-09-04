// lib/admin/stats.ts — 관리자 통계 집계 (순수 TS). 개인 식별 정보는 마스킹하고 집계만 낸다.

export interface Bucket {
  label: string;
  count: number;
}

export interface UserLite {
  id: string;
  login_id: string;
  biz_no: string;
  created_at: string;
  last_login_at: string | null;
}
export interface ProfileLite {
  user_id: string;
  data: Record<string, unknown> | null;
  updated_at: string;
}
export interface ProgramLite {
  is_synthetic: boolean;
  parsed_at: string | null;
  apply_end: string | null;
  is_rolling: boolean;
  support_field: string;
  review_status: string;
  source: string;
  duplicate_of: string | null;
}
export interface IngestRunLite {
  id: number;
  source: string;
  fetched: number;
  upserted: number;
  parsed: number;
  embedded: number;
  deduped: number;
  failed: number;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
}

export interface AdminStats {
  generatedAt: string;
  users: {
    total: number;
    new7d: number;
    new30d: number;
    active7d: number;
    withProfile: number;
    signupsByDay: { date: string; count: number }[];
  };
  profiles: {
    regions: Bucket[];
    industries: Bucket[];
    businessType: Bucket[];
    employees: Bucket[];
    age: Bucket[];
    certifications: Bucket[];
    flags: Bucket[];
    directions: number;
    drafts: number;
    tasksDone: number;
    customTasks: number;
  };
  programs: {
    total: number;
    synthetic: number;
    real: number;
    parsed: number;
    open: number;
    closing: number;
    closed: number;
    rolling: number;
    humanVerified: number;
    duplicates: number;
    byField: Bucket[];
    bySource: Bucket[];
  };
  obligations: { total: number; verified: number };
  ingest: { last: IngestRunLite | null; runs: IngestRunLite[] };
  members: {
    loginId: string;
    bizNoMasked: string;
    createdAt: string;
    lastLoginAt: string | null;
    region: string | null;
    industry: string | null;
    employees: number | null;
    hasProfile: boolean;
  }[];
}

const DAY = 86_400_000;

function toBuckets(counts: Map<string, number>, limit = 8): Bucket[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function inc(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

export function maskBizNo(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (d.length !== 10) return "***-**-*****";
  return `${d.slice(0, 3)}-**-***${d.slice(8)}`;
}

export function employeeBucket(n: number): string {
  if (n <= 0) return "0인";
  if (n <= 4) return "1~4인";
  if (n <= 9) return "5~9인";
  if (n <= 29) return "10~29인";
  return "30인 이상";
}

export function ageBucket(foundedAt: string, now: Date): string {
  const t = Date.parse(foundedAt);
  if (!Number.isFinite(t)) return "미상";
  const years = (now.getTime() - t) / (365.25 * DAY);
  if (years < 1) return "1년 미만";
  if (years < 3) return "1~3년";
  if (years < 7) return "3~7년";
  return "7년 이상";
}

const CERT_LABEL: Record<string, string> = {
  venture: "벤처기업", innobiz: "이노비즈", mainbiz: "메인비즈", research_institute: "기업부설연구소",
  social_enterprise: "사회적기업", women_enterprise: "여성기업", disabled_enterprise: "장애인기업",
};
const FLAG_LABEL: Record<string, string> = {
  hiring_planned: "채용 예정", has_online_sales: "온라인 판매", handles_personal_data: "개인정보 처리", is_food_business: "식품 취급",
};

type Profile = {
  region_label?: string; industry_label?: string; business_type?: string; employee_count?: number;
  founded_at?: string; certifications?: string[]; flags?: Record<string, boolean>; business_direction?: string | null;
};

function readProfile(data: Record<string, unknown> | null): Profile | null {
  const p = data?.profile;
  return p && typeof p === "object" ? (p as Profile) : null;
}

export function aggregate(input: {
  users: UserLite[];
  profiles: ProfileLite[];
  programs: ProgramLite[];
  obligations: { legal_checked_at: string | null }[];
  runs: IngestRunLite[];
  now: Date;
}): AdminStats {
  const { users, profiles, programs, obligations, runs, now } = input;
  const nowMs = now.getTime();
  const byUser = new Map(profiles.map((p) => [p.user_id, p]));

  // ── 회원 ──
  const signups = new Map<string, number>();
  for (let i = 29; i >= 0; i -= 1) signups.set(new Date(nowMs - i * DAY).toISOString().slice(0, 10), 0);
  let new7d = 0, new30d = 0, active7d = 0, withProfile = 0;
  for (const u of users) {
    const created = Date.parse(u.created_at);
    if (nowMs - created <= 7 * DAY) new7d += 1;
    if (nowMs - created <= 30 * DAY) new30d += 1;
    if (u.last_login_at && nowMs - Date.parse(u.last_login_at) <= 7 * DAY) active7d += 1;
    const day = u.created_at.slice(0, 10);
    if (signups.has(day)) signups.set(day, (signups.get(day) ?? 0) + 1);
    if (readProfile(byUser.get(u.id)?.data ?? null)) withProfile += 1;
  }

  // ── 프로필 분포 ──
  const regions = new Map<string, number>(), industries = new Map<string, number>(), businessType = new Map<string, number>();
  const employees = new Map<string, number>(), age = new Map<string, number>(), certs = new Map<string, number>(), flags = new Map<string, number>();
  let directions = 0, drafts = 0, tasksDone = 0, customTasks = 0;
  for (const p of profiles) {
    const prof = readProfile(p.data);
    if (prof) {
      inc(regions, prof.region_label ?? "미상");
      inc(industries, prof.industry_label ?? "미상");
      inc(businessType, prof.business_type === "corporation" ? "법인" : prof.business_type === "individual" ? "개인" : "미상");
      inc(employees, employeeBucket(Number(prof.employee_count ?? 0)));
      inc(age, prof.founded_at ? ageBucket(prof.founded_at, now) : "미상");
      for (const c of prof.certifications ?? []) inc(certs, CERT_LABEL[c] ?? c);
      for (const [k, v] of Object.entries(prof.flags ?? {})) if (v) inc(flags, FLAG_LABEL[k] ?? k);
      if (prof.business_direction) directions += 1;
    }
    const d = p.data?.drafts;
    if (d && typeof d === "object") drafts += Object.keys(d as object).length;
    const t = p.data?.tasks as { done?: unknown; custom?: unknown } | undefined;
    if (t && typeof t === "object") {
      if (Array.isArray(t.done)) tasksDone += t.done.length;
      else if (t.done && typeof t.done === "object") tasksDone += Object.values(t.done as Record<string, unknown>).filter(Boolean).length;
      if (Array.isArray(t.custom)) customTasks += t.custom.length;
    }
  }

  // ── 공고 ──
  const byField = new Map<string, number>(), bySource = new Map<string, number>();
  let synthetic = 0, parsed = 0, open = 0, closing = 0, closed = 0, rolling = 0, humanVerified = 0, duplicates = 0;
  const today = now.toISOString().slice(0, 10);
  const in7 = new Date(nowMs + 7 * DAY).toISOString().slice(0, 10);
  for (const p of programs) {
    if (p.duplicate_of) { duplicates += 1; continue; }
    if (p.is_synthetic) synthetic += 1;
    if (p.parsed_at) parsed += 1;
    if (p.review_status === "human_verified") humanVerified += 1;
    inc(byField, p.support_field);
    inc(bySource, p.source);
    if (p.is_rolling || !p.apply_end) rolling += 1;
    else if (p.apply_end < today) closed += 1;
    else if (p.apply_end <= in7) closing += 1;
    else open += 1;
  }
  const canonical = programs.length - duplicates;

  const sortedRuns = [...runs].sort((a, b) => b.started_at.localeCompare(a.started_at));

  return {
    generatedAt: now.toISOString(),
    users: {
      total: users.length, new7d, new30d, active7d, withProfile,
      signupsByDay: [...signups.entries()].map(([date, count]) => ({ date, count })),
    },
    profiles: {
      regions: toBuckets(regions), industries: toBuckets(industries), businessType: toBuckets(businessType),
      employees: toBuckets(employees, 5), age: toBuckets(age, 5), certifications: toBuckets(certs), flags: toBuckets(flags),
      directions, drafts, tasksDone, customTasks,
    },
    programs: {
      total: canonical, synthetic, real: canonical - synthetic, parsed, open, closing, closed, rolling, humanVerified, duplicates,
      byField: toBuckets(byField, 8), bySource: toBuckets(bySource, 4),
    },
    obligations: { total: obligations.length, verified: obligations.filter((o) => o.legal_checked_at).length },
    ingest: { last: sortedRuns[0] ?? null, runs: sortedRuns.slice(0, 10) },
    members: [...users]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 50)
      .map((u) => {
        const prof = readProfile(byUser.get(u.id)?.data ?? null);
        return {
          loginId: u.login_id, bizNoMasked: maskBizNo(u.biz_no), createdAt: u.created_at, lastLoginAt: u.last_login_at,
          region: prof?.region_label ?? null, industry: prof?.industry_label ?? null,
          employees: prof ? Number(prof.employee_count ?? 0) : null, hasProfile: prof !== null,
        };
      }),
  };
}
