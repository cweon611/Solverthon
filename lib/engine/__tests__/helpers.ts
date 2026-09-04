// 엔진 테스트용 빌더. 시드(§10)와 독립적으로 최소 객체를 만든다.

import { resolveDate } from "@/lib/engine/format";
import type {
  Certification,
  CompanyProfile,
  Condition,
  ConditionField,
  ConditionGroup,
  DocumentType,
  Obligation,
  Operator,
  Program,
  ScheduleRule,
} from "@/lib/types";

/** 모든 테스트의 기준일 — 엔진은 new Date()를 부르지 않으므로 고정할 수 있다 */
export const TODAY = new Date(2026, 8, 3); // 2026-09-03

export function cond(
  field: ConditionField,
  op: Operator,
  value: Condition["value"],
  label = `${field} ${op} ${String(value)}`,
  sourceText = "공고 원문 근거 문장",
): Condition {
  return { field, op, value, label, source_text: sourceText };
}

export function and(...conditions: (Condition | ConditionGroup)[]): ConditionGroup {
  return { operator: "AND", conditions };
}

export function or(...conditions: (Condition | ConditionGroup)[]): ConditionGroup {
  return { operator: "OR", conditions };
}

export function program(overrides: Partial<Program> = {}): Program {
  return {
    id: "P1",
    source: "synthetic",
    source_id: "SEED-01",
    title: "테스트 지원사업",
    organization: "테스트기관",
    executing_org: null,
    support_field: "창업",
    support_type: null,
    amount_text: "최대 1억원",
    summary: null,
    apply_start: null,
    apply_end: null,
    is_rolling: true,
    original_url: null,
    attachment_url: null,
    apply_url: null,
    eligibility: and(),
    unmapped_conditions: [],
    required_documents: [],
    review_status: "human_verified",
    is_synthetic: true,
    duplicate_of: null,
    parsed_at: null,
    created_at: "2026-08-01",
    updated_at: "2026-08-01",
    ...overrides,
  };
}

export function obligation(overrides: Partial<Obligation> = {}): Obligation {
  return {
    id: "OBL-TEST-001",
    category: "tax",
    title: "테스트 의무",
    what: "무엇인가를 신고한다",
    penalty: "가산세 20%",
    authority: "국세청",
    legal_basis: null,
    legal_text_excerpt: null,
    legal_checked_at: null,
    how_to_url: null,
    applies_if: and(),
    schedule: { type: "monthly", day: 10 } as ScheduleRule,
    importance: "high",
    ...overrides,
  };
}

interface ProfileOverrides extends Partial<Omit<CompanyProfile, "flags">> {
  flags?: Partial<CompanyProfile["flags"]>;
}

/** founded_at·ceo_birth_date는 상대 토큰("-35m5d")도 받는다 */
export function profile(overrides: ProfileOverrides = {}, today: Date = TODAY): CompanyProfile {
  const { flags, founded_at, ceo_birth_date, ...rest } = overrides;
  const base: CompanyProfile = {
    id: "test-profile",
    name: "테스트 주식회사",
    biz_no: null,
    business_type: "corporation",
    industry_code: "J62",
    industry_label: "소프트웨어 개발업",
    region_code: "29",
    region_label: "광주광역시",
    founded_at: resolveDate("-35m5d", today),
    employee_count: 4,
    ceo_birth_date: resolveDate("-39y4m", today),
    ceo_gender: "male",
    annual_revenue_krw: 320_000_000,
    export_revenue_usd_prev_year: 0,
    is_vat_exempt: false,
    certifications: [] as Certification[],
    flags: {
      hiring_planned: true,
      has_online_sales: false,
      handles_personal_data: false,
      is_food_business: false,
    },
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
    ...rest,
  };
  if (founded_at !== undefined) base.founded_at = resolveDate(founded_at, today);
  if (ceo_birth_date !== undefined) {
    base.ceo_birth_date = ceo_birth_date === null ? null : resolveDate(ceo_birth_date, today);
  }
  if (flags) base.flags = { ...base.flags, ...flags };
  return base;
}

export function docType(overrides: Partial<DocumentType> = {}): DocumentType {
  return {
    id: "sme_confirmation",
    name: "중소기업확인서",
    issuer: "중소기업현황정보시스템(sminfo)",
    lead_time_days: 20,
    issue_url: null,
    verified_at: null,
    ...overrides,
  };
}
