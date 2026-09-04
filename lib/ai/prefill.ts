// lib/ai/prefill.ts — 신청서 템플릿의 {{키}}를 브라우저에서 프로필로 채운다.
// 서버(LLM)는 프로필을 보지 못한다. 치환은 여기, 클라이언트에서만 일어난다 (§0.1-4).

import { CERT_LABEL } from "@/lib/constants";
import { ageYears, fmtBusinessAge, fmtDate, fromIso, monthsBetween } from "@/lib/engine/format";
import type { CompanyProfile } from "@/lib/types";

import { PREFILL_KEYS, PREFILL_LABEL, type PrefillKey } from "./geminiSchemas";

export type PrefillValues = Record<PrefillKey, string | null>;

export function buildPrefillValues(p: CompanyProfile, today: Date): PrefillValues {
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
    certifications: p.certifications.length > 0 ? p.certifications.map((c) => CERT_LABEL[c] ?? c).join(", ") : null,
    business_direction: p.business_direction?.trim() || null,
  };
}

const KEY_RE = /\{\{\s*([a-z_]+)\s*\}\}/g;

/**
 * {{키}}를 값으로 바꾼다. 값이 없거나 모르는 키면 [[입력 필요: 라벨]] 빈칸으로 남긴다.
 * [[...]] 빈칸은 그대로 둔다 — 사용자가 쓸 자리다.
 */
export function applyPrefill(template: string, values: PrefillValues): { text: string; filled: PrefillKey[]; missing: string[] } {
  const filled = new Set<PrefillKey>();
  const missing = new Set<string>();
  const text = template.replace(KEY_RE, (_, raw: string) => {
    const key = raw as PrefillKey;
    if ((PREFILL_KEYS as readonly string[]).includes(key)) {
      const v = values[key];
      if (v) {
        filled.add(key);
        return v;
      }
      missing.add(PREFILL_LABEL[key]);
      return `[[입력 필요: ${PREFILL_LABEL[key]}]]`;
    }
    missing.add(raw);
    return `[[입력 필요: ${raw}]]`;
  });
  return { text, filled: [...filled], missing: [...missing] };
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
