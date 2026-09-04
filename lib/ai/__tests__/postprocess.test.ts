// PRD §12.1 케이스 39~42 — postprocess

import { describe, expect, it } from "vitest";

import { matchDocumentType, normalizeDocName, postprocess } from "@/lib/ai/postprocess";
import type { ParsedAnnouncement, ParsedCondition } from "@/lib/ai/schema";
import type { Condition, ConditionGroup, DocumentType } from "@/lib/types";

const cond = (over: Partial<ParsedCondition> = {}): ParsedCondition => ({
  field: "business_age_months",
  op: "lte",
  value: "36",
  label: "업력 3년 이내",
  source_text: "창업 후 3년 이내 기업이어야 합니다.",
  ...over,
}) as ParsedCondition;

const parsed = (over: Partial<ParsedAnnouncement> = {}): ParsedAnnouncement => ({
  title: "테스트 공고",
  organization: "테스트기관",
  executing_org: null,
  support_field: "창업",
  support_type: null,
  amount_text: "최대 1억원",
  summary: "요약",
  apply_start: null,
  apply_end: null,
  is_rolling: true,
  conditions: [],
  alternatives: [],
  unmapped_conditions: [],
  required_documents: [],
  confidence: 0.9,
  ...over,
});

const isGroup = (n: Condition | ConditionGroup): n is ConditionGroup => "operator" in n;

const DOC_TYPES: DocumentType[] = [
  { id: "sme_confirmation", name: "중소기업확인서", issuer: "sminfo", lead_time_days: 20, issue_url: null, verified_at: null },
  { id: "biz_registration_cert", name: "사업자등록증명", issuer: "홈택스", lead_time_days: 0, issue_url: null, verified_at: null },
];

describe("postprocess", () => {
  it("39. 알 수 없는 field는 unmapped로 옮긴다", () => {
    const r = postprocess(parsed({ conditions: [cond({ field: "made_up_field" as ParsedCondition["field"] })] }));
    expect(r.eligibility.conditions).toHaveLength(0);
    expect(r.unmapped_conditions).toHaveLength(1);
    expect(r.unmapped_conditions[0].reason).toContain("알 수 없는 프로필 항목");
  });

  it("40. 문자열 value를 필드 타입으로 바꾼다", () => {
    const r = postprocess(
      parsed({
        conditions: [
          cond({ field: "business_age_months", op: "lte", value: "36" }),
          cond({ field: "hiring_planned", op: "eq", value: "true" }),
          cond({ field: "region_code", op: "in", value: "29,46" }),
          cond({ field: "annual_revenue_krw", op: "lte", value: "2,000,000,000" }),
        ],
      }),
    );
    const leaves = r.eligibility.conditions.filter((c): c is Condition => !isGroup(c));
    expect(leaves[0].value).toBe(36);
    expect(leaves[1].value).toBe(true);
    expect(leaves[2].value).toEqual(["29", "46"]);
    expect(leaves[3].value).toBe(2_000_000_000);
  });

  it("40b. 숫자로 못 읽는 값은 unmapped로 간다", () => {
    const r = postprocess(parsed({ conditions: [cond({ field: "employee_count", op: "gte", value: "여러 명" })] }));
    expect(r.eligibility.conditions).toHaveLength(0);
    expect(r.unmapped_conditions[0].reason).toContain("값을 해석할 수 없음");
  });

  it("41. alternatives 원소 1개(조건 2개) → OR 그룹 1개", () => {
    const r = postprocess(
      parsed({
        alternatives: [
          {
            label: "다음 중 하나",
            conditions: [
              cond({ field: "ceo_age", op: "lte", value: "39" }),
              cond({ field: "hiring_planned", op: "eq", value: "true" }),
            ],
          },
        ],
      }),
    );
    expect(r.eligibility.conditions).toHaveLength(1);
    const g = r.eligibility.conditions[0];
    expect(isGroup(g)).toBe(true);
    expect((g as ConditionGroup).operator).toBe("OR");
    expect((g as ConditionGroup).conditions).toHaveLength(2);
  });

  it("41b. 원소 2개 → OR 그룹 2개", () => {
    const block = (v: string) => ({
      label: "묶음",
      conditions: [cond({ field: "ceo_age", op: "lte", value: v }), cond({ field: "hiring_planned", op: "eq", value: "true" })],
    });
    const r = postprocess(parsed({ alternatives: [block("39"), block("34")] }));
    expect(r.eligibility.conditions.filter(isGroup)).toHaveLength(2);
  });

  it("41c. 조건 1개짜리 원소는 그룹 없이 루트에 직접 넣는다", () => {
    const r = postprocess(
      parsed({ alternatives: [{ label: "하나뿐", conditions: [cond({ field: "ceo_age", op: "lte", value: "39" })] }] }),
    );
    expect(r.eligibility.conditions).toHaveLength(1);
    expect(isGroup(r.eligibility.conditions[0])).toBe(false);
  });

  it("42. confidence 0.4 → 확신도 항목을 unmapped에 추가", () => {
    const r = postprocess(parsed({ confidence: 0.4 }));
    expect(r.unmapped_conditions.some((u) => u.text.includes("확신도"))).toBe(true);
    const ok = postprocess(parsed({ confidence: 0.9 }));
    expect(ok.unmapped_conditions).toHaveLength(0);
  });

  it("서류는 정규화 이름과 동의어로 카탈로그에 붙인다", () => {
    expect(normalizeDocName("중소기업(소상공인)확인서")).toBe("중소기업소상공인확인서");
    expect(matchDocumentType("중소기업확인서", DOC_TYPES)).toBe("sme_confirmation");
    expect(matchDocumentType("중소기업(소상공인)확인서", DOC_TYPES)).toBe("sme_confirmation");
    expect(matchDocumentType("사업자등록증명원", DOC_TYPES)).toBe("biz_registration_cert");
    expect(matchDocumentType("알 수 없는 서류", DOC_TYPES)).toBeNull();
  });

  it("서류명 뒤의 부수 표현을 떼고 매칭한다 (공고문은 \"1부\"를 자주 붙인다)", () => {
    expect(matchDocumentType("사업자등록증명 1부", DOC_TYPES)).toBe("biz_registration_cert");
    expect(matchDocumentType("중소기업확인서 각 1부", DOC_TYPES)).toBe("sme_confirmation");
    expect(matchDocumentType("사업자등록증명 사본", DOC_TYPES)).toBe("biz_registration_cert");
  });

  it("서류 매칭에 실패해도 목록에는 남고 id만 null이 된다", () => {
    const r = postprocess(
      parsed({ required_documents: [{ name: "특이한 증명서", source_text: "제출", is_required: true }] }),
      DOC_TYPES,
    );
    expect(r.required_documents).toHaveLength(1);
    expect(r.required_documents[0].document_type_id).toBeNull();
  });

  it("summary는 200자로 자른다", () => {
    const r = postprocess(parsed({ summary: "가".repeat(300) }));
    expect(r.summary).toHaveLength(200);
  });
});
