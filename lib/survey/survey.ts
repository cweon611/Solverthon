// lib/survey/survey.ts — 설문형 회원 정보 수집의 순수 로직 (화면은 components/screens/SurveyScreen.tsx)
// LLM을 쓰지 않는다. 답은 사용자가 고른 값 그대로이고, 검증·변환은 여기서만 한다.
//
// "답하지 않음"과 "모름"을 구분한다: 모름은 답이다(해당 요건은 확인 필요로 판정),
// 답하지 않음은 설문이 아직 그 질문에 도달하지 않았다는 뜻이다(answered 목록에 없음).

import { INDUSTRIES, INDUSTRY_KEYWORDS, REGIONS } from "@/lib/constants";
import { evaluateAll, toFlatProfile, type ProgramVerdict } from "@/lib/engine/evaluate";
import { fromIso, toIso } from "@/lib/engine/format";
import type { Certification, CompanyProfile, ConditionField, ConditionGroup, Condition, PriorSupport, Program } from "@/lib/types";

// ─── 답안 ────────────────────────────────────────────────────────────────────

export interface Answers {
  name: string;
  business_type: "individual" | "corporation" | null;
  industry_code: string;
  region_code: string;
  founded_at: string; // YYYY-MM-DD
  employee_count: number | null;
  hiring_planned: boolean | null;
  ceo_birth_date: string | null; // null = 답하지 않음(모름)
  ceo_gender: "male" | "female" | null;
  has_tax_arrears: boolean | null;
  prior_support: PriorSupport[] | null;
  certifications: Certification[];
  revenue_eok: string; // "" = 모름
  export_usd: string; // "" = 모름, "0" = 수출 없음
  is_vat_exempt: boolean;
  has_online_sales: boolean;
  handles_personal_data: boolean;
  is_food_business: boolean;
  business_direction: string;
}

export const EMPTY_ANSWERS: Answers = {
  name: "", business_type: null, industry_code: "", region_code: "", founded_at: "", employee_count: null,
  hiring_planned: null, ceo_birth_date: null, ceo_gender: null, has_tax_arrears: null, prior_support: null,
  certifications: [], revenue_eok: "", export_usd: "", is_vat_exempt: false, has_online_sales: false,
  handles_personal_data: false, is_food_business: false, business_direction: "",
};

export function answersFromProfile(p: CompanyProfile): Answers {
  return {
    name: p.name === "내 회사" ? "" : p.name,
    business_type: p.business_type,
    industry_code: p.industry_code,
    region_code: p.region_code,
    founded_at: p.founded_at,
    employee_count: p.employee_count,
    hiring_planned: p.flags.hiring_planned,
    ceo_birth_date: p.ceo_birth_date,
    ceo_gender: p.ceo_gender,
    has_tax_arrears: p.has_tax_arrears ?? null,
    prior_support: p.prior_support ?? null,
    certifications: p.certifications,
    revenue_eok: p.annual_revenue_krw === null ? "" : String(p.annual_revenue_krw / 100_000_000),
    export_usd: p.export_revenue_usd_prev_year === null ? "" : String(p.export_revenue_usd_prev_year),
    is_vat_exempt: p.is_vat_exempt,
    has_online_sales: p.flags.has_online_sales,
    handles_personal_data: p.flags.handles_personal_data,
    is_food_business: p.flags.is_food_business,
    business_direction: p.business_direction ?? "",
  };
}

function num(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s.replace(/[,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** 필수 5개가 있어야 프로필이 된다. 없으면 null */
export function answersToProfile(a: Answers, base: { id: string; created_at: string; biz_no: string | null }): CompanyProfile | null {
  if (missingRequired(a).length > 0) return null;
  const industry = INDUSTRIES.find((i) => i.code === a.industry_code)!;
  const region = REGIONS.find((r) => r.code === a.region_code)!;
  const eok = num(a.revenue_eok);
  return {
    id: base.id,
    name: a.name.trim() || "내 회사",
    biz_no: base.biz_no,
    business_type: a.business_type!,
    industry_code: industry.code,
    industry_label: industry.label,
    region_code: region.code,
    region_label: region.label,
    founded_at: a.founded_at,
    employee_count: a.employee_count!,
    ceo_birth_date: a.ceo_birth_date,
    ceo_gender: a.ceo_gender,
    annual_revenue_krw: eok === null ? null : Math.round(eok * 100_000_000),
    export_revenue_usd_prev_year: num(a.export_usd),
    is_vat_exempt: a.is_vat_exempt,
    certifications: a.certifications,
    has_tax_arrears: a.has_tax_arrears,
    prior_support: a.prior_support,
    flags: {
      // 채용 계획 "모름"은 이벤트형 의무를 미리 띄우지 않는 쪽(false)으로 둔다 — 판정 조건이 아니라 알림 축이다
      hiring_planned: a.hiring_planned ?? false,
      has_online_sales: a.has_online_sales,
      handles_personal_data: a.handles_personal_data,
      is_food_business: a.is_food_business,
    },
    business_direction: a.business_direction.trim() || null,
    created_at: base.created_at,
    updated_at: base.created_at,
  };
}

// ─── 검증 ────────────────────────────────────────────────────────────────────

export const REQUIRED: { key: keyof Answers; label: string }[] = [
  { key: "business_type", label: "사업자 형태" },
  { key: "industry_code", label: "업종" },
  { key: "region_code", label: "지역" },
  { key: "founded_at", label: "개업일" },
  { key: "employee_count", label: "상시근로자 수" },
];

export function missingRequired(a: Answers): string[] {
  return REQUIRED.filter(({ key }) => a[key] === null || a[key] === "").map(({ label }) => label);
}

/** 실재하는 날짜인가 — fromIso는 2월 30일을 3월 2일로 넘겨 버린다 */
function realDate(iso: string): Date | null {
  const d = fromIso(iso);
  return d && toIso(d) === iso ? d : null;
}

/** 개업일: 형식 · 실재하는 날짜 · 미래 아님 · 1950년 이후 */
export function foundedError(iso: string, today: Date): string | null {
  if (!iso) return null;
  if (!realDate(iso)) return "날짜 형식이 올바르지 않습니다.";
  if (iso > toIso(today)) return "미래 날짜는 입력할 수 없습니다.";
  if (iso < "1950-01-01") return "1950년 이후 날짜를 입력해 주세요.";
  return null;
}

/** 대표자 생년월일: 만 15~100세 범위만 받는다 (오타 방지) */
export function birthError(iso: string | null, today: Date): string | null {
  if (!iso) return null;
  const d = realDate(iso);
  if (!d) return "날짜 형식이 올바르지 않습니다.";
  const age = today.getFullYear() - d.getFullYear();
  if (age < 15 || age > 100) return "생년월일을 다시 확인해 주세요.";
  return null;
}

// ─── 업종 검색 ───────────────────────────────────────────────────────────────

/** 이름·코드·일상어로 찾는다. "카페" → I5622, "쇼핑몰" → G47 */
export function searchIndustries(query: string): typeof INDUSTRIES {
  const q = query.trim().toLowerCase();
  if (!q) return INDUSTRIES;
  return INDUSTRIES.filter((i) =>
    i.label.toLowerCase().includes(q) || i.code.toLowerCase().includes(q) ||
    (INDUSTRY_KEYWORDS[i.code] ?? []).some((k) => k.includes(q) || q.includes(k)));
}

/** 세부 업종이 있는데 대분류·"세부 모름"을 골랐는가 — 업종 제한 공고에서 확인 필요가 생긴다 */
export function isBroadIndustry(code: string): boolean {
  return code !== "" && INDUSTRIES.some((i) => i.code !== code && i.code.startsWith(code));
}

// ─── 판정 미리보기 ───────────────────────────────────────────────────────────

export interface Preview {
  eligible: number;
  conditional: number;
  ineligible: number;
  needsCheck: number;
  /** 확인 필요 요건을 확정하려면 답해야 할 항목 → 걸린 공고 수 (많은 순) */
  unlock: { input: string; programs: number }[];
}

export function preview(a: Answers, programs: Program[], today: Date): Preview | null {
  if (foundedError(a.founded_at, today)) return null; // 잘못된 개업일로 판정을 보여주지 않는다
  const p = answersToProfile(a, { id: "preview", created_at: today.toISOString(), biz_no: null });
  if (!p) return null;
  const verdicts: ProgramVerdict[] = evaluateAll(programs, toFlatProfile(p, today), today);
  const unlock = new Map<string, Set<string>>();
  for (const v of verdicts) {
    if (v.overall !== "needs_check") continue;
    for (const c of v.criteria) {
      if (c.state === "check" && c.missingInput) {
        if (!unlock.has(c.missingInput)) unlock.set(c.missingInput, new Set());
        unlock.get(c.missingInput)!.add(v.programId);
      }
    }
  }
  return {
    eligible: verdicts.filter((v) => v.overall === "eligible").length,
    conditional: verdicts.filter((v) => v.overall === "ineligible" && v.nearMiss).length,
    ineligible: verdicts.filter((v) => v.overall === "ineligible" && !v.nearMiss).length,
    needsCheck: verdicts.filter((v) => v.overall === "needs_check").length,
    unlock: [...unlock.entries()].map(([input, s]) => ({ input, programs: s.size })).sort((x, y) => y.programs - x.programs),
  };
}

// ─── 질문이 왜 필요한가 ──────────────────────────────────────────────────────

function leaves(n: Condition | ConditionGroup): Condition[] {
  return "conditions" in n ? n.conditions.flatMap(leaves) : [n];
}

/** 이 항목(들)을 자격 조건으로 쓰는 공고 수 — 질문 화면의 "이 답은 공고 N건의 자격에 쓰입니다" */
export function programsUsing(fields: ConditionField[], programs: Program[]): number {
  return programs.filter((p) => leaves(p.eligibility).some((c) => fields.includes(c.field))).length;
}
