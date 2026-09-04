// lib/ai/interviewCoerce.ts — 인터뷰 LLM이 뽑은 문자열 값을 검증·정규화해 프로필로 만든다.
// LLM 출력은 신뢰하지 않는다: 코드표에 없는 코드, 미래 날짜, 음수는 전부 버린다.

import { INDUSTRIES, REGIONS } from "@/lib/constants";
import { fromIso, toIso } from "@/lib/engine/format";
import type { Certification, CompanyProfile } from "@/lib/types";

import type { InterviewExtractedRaw } from "./geminiSchemas";

export interface InterviewExtract {
  name: string | null;
  business_type: "individual" | "corporation" | null;
  industry_code: string | null;
  region_code: string | null;
  founded_at: string | null;
  employee_count: number | null;
  ceo_birth_date: string | null;
  ceo_gender: "male" | "female" | null;
  annual_revenue_krw: number | null;
  hiring_planned: boolean | null;
  has_online_sales: boolean | null;
  handles_personal_data: boolean | null;
  is_food_business: boolean | null;
  certifications: Certification[];
  business_direction: string | null;
}

export const EMPTY_EXTRACT: InterviewExtract = {
  name: null, business_type: null, industry_code: null, region_code: null, founded_at: null,
  employee_count: null, ceo_birth_date: null, ceo_gender: null, annual_revenue_krw: null,
  hiring_planned: null, has_online_sales: null, handles_personal_data: null, is_food_business: null,
  certifications: [], business_direction: null,
};

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function validDate(s: string, todayIso: string): string | null {
  const t = s.trim();
  if (!DATE_RE.test(t)) return null;
  if (!fromIso(t)) return null;
  if (t > todayIso) return null; // 미래 날짜 차단 (§5.1)
  return t;
}

function tri(v: "true" | "false" | ""): boolean | null {
  return v === "" ? null : v === "true";
}

export function coerceExtracted(raw: InterviewExtractedRaw, today: Date): InterviewExtract {
  const todayIso = toIso(today);
  const industry = INDUSTRIES.find((i) => i.code === raw.industry_code.trim().toUpperCase());
  const region = REGIONS.find((r) => r.code === raw.region_code.trim());
  const emp = Number.parseInt(raw.employee_count, 10);
  const eok = Number.parseFloat(raw.annual_revenue_eok.replace(/,/g, ""));
  return {
    name: raw.name.trim() || null,
    business_type: raw.business_type === "" ? null : raw.business_type,
    industry_code: industry?.code ?? null,
    region_code: region?.code ?? null,
    founded_at: validDate(raw.founded_at, todayIso),
    employee_count: Number.isInteger(emp) && emp >= 0 && emp <= 999 ? emp : null,
    ceo_birth_date: validDate(raw.ceo_birth_date, todayIso),
    ceo_gender: raw.ceo_gender === "" ? null : raw.ceo_gender,
    annual_revenue_krw: Number.isFinite(eok) && eok >= 0 ? Math.round(eok * 100_000_000) : null,
    hiring_planned: tri(raw.hiring_planned),
    has_online_sales: tri(raw.has_online_sales),
    handles_personal_data: tri(raw.handles_personal_data),
    is_food_business: tri(raw.is_food_business),
    certifications: [...new Set(raw.certifications)],
    business_direction: raw.business_direction.trim() || null,
  };
}

/** 누적: 새 값이 있으면 덮고, 없으면 이전 값을 지킨다 (LLM이 한 턴에 값을 빠뜨려도 잃지 않는다) */
export function mergeExtract(prev: InterviewExtract, next: InterviewExtract): InterviewExtract {
  const out = { ...prev };
  for (const key of Object.keys(next) as (keyof InterviewExtract)[]) {
    const v = next[key];
    if (key === "certifications") {
      out.certifications = [...new Set([...prev.certifications, ...next.certifications])];
    } else if (v !== null && v !== undefined) {
      (out as Record<string, unknown>)[key] = v;
    }
  }
  return out;
}

export const REQUIRED_LABELS: Record<"business_type" | "industry_code" | "region_code" | "founded_at" | "employee_count", string> = {
  business_type: "사업자 형태", industry_code: "업종", region_code: "지역", founded_at: "개업일", employee_count: "상시근로자 수",
};

export function missingRequired(ex: InterviewExtract): string[] {
  return (Object.keys(REQUIRED_LABELS) as (keyof typeof REQUIRED_LABELS)[])
    .filter((k) => ex[k] === null)
    .map((k) => REQUIRED_LABELS[k]);
}

function newProfileId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `profile-${Date.now()}`;
}

/** 필수 5개가 있을 때만 프로필을 만든다. 선택 항목의 null은 "모름"으로 그대로 저장한다 */
export function extractToProfile(ex: InterviewExtract): CompanyProfile | null {
  if (missingRequired(ex).length > 0) return null;
  const now = new Date().toISOString();
  const industry = INDUSTRIES.find((i) => i.code === ex.industry_code)!;
  const region = REGIONS.find((r) => r.code === ex.region_code)!;
  return {
    id: newProfileId(),
    name: ex.name ?? "내 회사",
    biz_no: null,
    business_type: ex.business_type!,
    industry_code: industry.code,
    industry_label: industry.label,
    region_code: region.code,
    region_label: region.label,
    founded_at: ex.founded_at!,
    employee_count: ex.employee_count!,
    ceo_birth_date: ex.ceo_birth_date,
    ceo_gender: ex.ceo_gender,
    annual_revenue_krw: ex.annual_revenue_krw,
    export_revenue_usd_prev_year: null,
    is_vat_exempt: false,
    certifications: ex.certifications,
    flags: {
      hiring_planned: ex.hiring_planned ?? false,
      has_online_sales: ex.has_online_sales ?? false,
      handles_personal_data: ex.handles_personal_data ?? false,
      is_food_business: ex.is_food_business ?? false,
    },
    business_direction: ex.business_direction,
    created_at: now,
    updated_at: now,
  };
}
