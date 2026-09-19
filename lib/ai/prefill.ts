// lib/ai/prefill.ts — 신청서 템플릿의 {{키}}를 브라우저에서 프로필·내 사업 정보로 채운다.
// 서버(LLM)는 프로필도, 내 사업 정보도 보지 못한다. 치환은 여기, 클라이언트에서만 일어난다 (§0.1-4).
//
// 토큰 세 종류:
//   {{company_name}} 등   — 프로필에서 계산한 값 (PREFILL_KEYS)
//   {{lib:problem}} 등    — 사용자가 "내 사업 정보"에 쓴 문장 (lib/draft/library.ts)
//   [[안내문]]            — 사용자가 이 문단에서만 직접 쓸 빈칸
// 값이 없는 토큰은 [[입력 필요: 라벨]]이 된다. 나중에 값이 생기면 refill()이 그 빈칸도 채운다.

import { CERT_LABEL } from "@/lib/constants";
import { LIB_FIELDS, LIB_KEYS, LIB_LABEL_TO_KEY, type LibKey, type Library } from "@/lib/draft/library";
import { ageYears, fmtBusinessAge, fmtDate, fromIso, monthsBetween } from "@/lib/engine/format";
import type { CompanyProfile } from "@/lib/types";

import { PREFILL_KEYS, PREFILL_LABEL, type PrefillKey } from "./geminiSchemas";

export type PrefillValues = Record<PrefillKey, string | null>;

export function buildPrefillValues(p: CompanyProfile, today: Date, extra: { eligibility_summary?: string | null } = {}): PrefillValues {
  const founded = fromIso(p.founded_at);
  const ageMonths = founded ? monthsBetween(founded, today) : null;
  return {
    company_name: p.name.trim() || null,
    biz_no: p.biz_no,
    business_type: p.business_type === "corporation" ? "법인사업자" : "개인사업자",
    industry: p.industry_label || null,
    region: p.region_label || null,
    founded_at: founded ? fmtDate(founded) : null,
    business_age: ageMonths === null ? null : fmtBusinessAge(ageMonths),
    employee_count: `${p.employee_count}명`,
    ceo_age: p.ceo_birth_date ? `만 ${ageYears(p.ceo_birth_date, today)}세` : null,
    annual_revenue: p.annual_revenue_krw === null ? null : `${(p.annual_revenue_krw / 100_000_000).toLocaleString("ko-KR")}억원`,
    // 인증이 없는 것도 답이다 — 빈칸으로 남기지 않는다
    certifications: p.certifications.length > 0 ? p.certifications.map((c) => CERT_LABEL[c] ?? c).join(", ") : "없음",
    business_direction: p.business_direction?.trim() || null,
    eligibility_summary: extra.eligibility_summary ?? null,
  };
}

const KEY_RE = /\{\{\s*(lib:)?([a-z_]+)\s*\}\}/g;
const NEED_RE = /\[\[입력 필요: ([^\]]+)\]\]/g;

export interface FillResult {
  text: string;
  filled: string[]; // 채운 토큰 ("company_name", "lib:problem")
  missing: string[]; // 값이 없어 빈칸이 된 라벨
  libMissing: LibKey[]; // 그중 "내 사업 정보"로 채울 수 있는 것
}

function lookup(lib: boolean, key: string, values: PrefillValues, library: Library): { value: string | null; label: string; known: boolean } {
  if (lib) {
    if (!(LIB_KEYS as readonly string[]).includes(key)) return { value: null, label: key, known: false };
    const k = key as LibKey;
    const v = library[k]?.trim();
    return { value: v ? v : null, label: LIB_FIELDS[k].label, known: true };
  }
  if (!(PREFILL_KEYS as readonly string[]).includes(key)) return { value: null, label: key, known: false };
  const k = key as PrefillKey;
  return { value: values[k], label: PREFILL_LABEL[k], known: true };
}

/**
 * {{키}}를 값으로 바꾼다. 값이 없거나 모르는 키면 [[입력 필요: 라벨]] 빈칸으로 남긴다.
 * [[...]] 빈칸은 그대로 둔다 — 사용자가 쓸 자리다.
 */
export function applyPrefill(template: string, values: PrefillValues, library: Library = {}): FillResult {
  const filled = new Set<string>();
  const missing = new Set<string>();
  const libMissing = new Set<LibKey>();
  const text = template.replace(KEY_RE, (_, lib: string | undefined, raw: string) => {
    const r = lookup(Boolean(lib), raw, values, library);
    if (r.value) {
      filled.add(lib ? `lib:${raw}` : raw);
      return r.value;
    }
    missing.add(r.label);
    if (lib && r.known) libMissing.add(raw as LibKey);
    return `[[입력 필요: ${r.label}]]`;
  });
  return { text, filled: [...filled], missing: [...missing], libMissing: [...libMissing] };
}

/**
 * 사용자가 이미 고친 문단 안의 [[입력 필요: 라벨]]을, 그 사이 생긴 값으로 채운다.
 * (프로필을 고쳤거나 "내 사업 정보"를 새로 썼을 때 — 고친 문단을 다시 뼈대로 되돌리지 않는다)
 */
export function refill(text: string, values: PrefillValues, library: Library = {}): string {
  return text.replace(NEED_RE, (whole, label: string) => {
    const libKey = LIB_LABEL_TO_KEY[label];
    if (libKey) return library[libKey]?.trim() || whole;
    const pre = (Object.keys(PREFILL_LABEL) as PrefillKey[]).find((k) => PREFILL_LABEL[k] === label);
    if (pre) return values[pre] || whole;
    return whole;
  });
}

/** 문단 안의 "내 사업 정보" 빈칸 — 빈칸 채우기 패널이 한 번에 모아 묻는다 */
export function libBlanks(text: string): LibKey[] {
  const out = new Set<LibKey>();
  for (const m of text.matchAll(NEED_RE)) {
    const k = LIB_LABEL_TO_KEY[m[1]];
    if (k) out.add(k);
  }
  return [...out];
}

/** 문단 안의 자유 빈칸(내 사업 정보·프로필이 아닌 [[...]]) — 그 자리에서 직접 채운다 */
export function freeBlanks(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\[\[([^\]]+)\]\]/g)) {
    const inner = m[1];
    const need = inner.startsWith("입력 필요: ") ? inner.slice("입력 필요: ".length) : null;
    if (need && (LIB_LABEL_TO_KEY[need] || Object.values(PREFILL_LABEL).includes(need))) continue;
    out.push(inner);
  }
  return out;
}

/** 자유 빈칸 하나를 답으로 바꾼다 (같은 문구의 첫 번째 빈칸만) */
export function fillBlank(text: string, blank: string, answer: string): string {
  const token = `[[${blank}]]`;
  const i = text.indexOf(token);
  if (i < 0 || !answer.trim()) return text;
  return text.slice(0, i) + answer.trim() + text.slice(i + token.length);
}

/** 미리보기용: 텍스트를 일반 조각과 [[빈칸]] 조각으로 나눈다 */
export function splitBlanks(text: string): { kind: "text" | "blank"; value: string }[] {
  const out: { kind: "text" | "blank"; value: string }[] = [];
  const re = /\[\[([^\]]+)\]\]/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push({ kind: "text", value: text.slice(last, m.index) });
    out.push({ kind: "blank", value: m[1] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", value: text.slice(last) });
  return out;
}

export function countBlanks(text: string): number {
  return (text.match(/\[\[[^\]]+\]\]/g) ?? []).length;
}

/** 붙여넣기용 평문 — 한글·워드 양식에 그대로 붙인다 (마크다운 기호 없음) */
export function toPlainText(title: string, sections: { heading: string; text: string }[]): string {
  return [title, "", ...sections.flatMap((s) => [s.heading, "", s.text, ""])].join("\n").trim() + "\n";
}
