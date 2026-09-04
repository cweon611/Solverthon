// PRD §12.1 케이스 1~16 — evaluate

import { describe, expect, it } from "vitest";

import { evaluateGroup, evaluateProgram, toFlatProfile } from "@/lib/engine/evaluate";

import { TODAY, and, cond, or, profile, program } from "./helpers";

const flat = (o?: Parameters<typeof profile>[0]) => toFlatProfile(profile(o), TODAY);

describe("evaluate — 조건·그룹", () => {
  it("1. 모든 조건 pass → eligible", () => {
    const p = program({
      eligibility: and(
        cond("business_age_months", "lte", 84),
        cond("region_code", "in", ["29"]),
        cond("employee_count", "lt", 10),
      ),
    });
    const v = evaluateProgram(p, flat(), TODAY);
    expect(v.overall).toBe("eligible");
    expect(v.criteria).toHaveLength(3);
    expect(v.criteria.every((c) => c.state === "pass")).toBe(true);
    expect(v.nearMiss).toBeNull();
  });

  it("2. 조건 1개 fail(fixed 필드) → ineligible, nearMiss null", () => {
    const p = program({ eligibility: and(cond("ceo_gender", "eq", "female", "여성 대표자")) });
    const v = evaluateProgram(p, flat(), TODAY);
    expect(v.overall).toBe("ineligible");
    expect(v.nearMiss).toBeNull();
    expect(v.criteria[0].state).toBe("fail");
  });

  it("3. annual_revenue_krw null인 조건 → check, 종합 needs_check", () => {
    const p = program({ eligibility: and(cond("annual_revenue_krw", "lte", 2_000_000_000)) });
    const v = evaluateProgram(p, flat({ annual_revenue_krw: null }), TODAY);
    expect(v.criteria[0].state).toBe("check");
    expect(v.overall).toBe("needs_check");
    expect(v.criteria[0].current).toBe("미입력");
  });

  it("4. unmapped_conditions 1개 → check 행 추가, 종합 needs_check", () => {
    const p = program({
      eligibility: and(cond("business_age_months", "lte", 84)),
      unmapped_conditions: [{ text: "TIPS 운영사 추천 필요", reason: "프로필 필드에 매핑 불가" }],
    });
    const v = evaluateProgram(p, flat(), TODAY);
    expect(v.overall).toBe("needs_check");
    expect(v.criteria).toHaveLength(2);
    expect(v.criteria[1]).toMatchObject({ field: null, state: "check", sourceText: "TIPS 운영사 추천 필요" });
  });

  it("4b. unmapped가 있어도 확정 fail이 있으면 ineligible (§10.2 #16 프로필 ③)", () => {
    const p = program({
      eligibility: and(cond("region_code", "in", ["29"])),
      unmapped_conditions: [{ text: "지역 우수기업 우선", reason: "모호" }],
    });
    const v = evaluateProgram(p, flat({ region_code: "46" }), TODAY);
    expect(v.overall).toBe("ineligible");
  });

  it("5. AND 안의 OR: OR 중 하나 pass → 그룹 pass", () => {
    const g = and(or(cond("ceo_age", "lte", 39), cond("hiring_planned", "eq", true)));
    expect(evaluateGroup(g, flat({ ceo_birth_date: "-46y" }))).toBe("pass");
  });

  it("6. OR 전부 fail → 그룹 fail", () => {
    const g = or(cond("ceo_gender", "eq", "female"), cond("region_code", "in", ["11"]));
    expect(evaluateGroup(g, flat())).toBe("fail");
  });

  it("7. OR에 check 포함·pass 없음 → check", () => {
    const g = or(cond("ceo_gender", "eq", "female"), cond("annual_revenue_krw", "lte", 100));
    expect(evaluateGroup(g, flat({ annual_revenue_krw: null }))).toBe("check");
  });

  it("8. industry_code prefix 매칭", () => {
    const p = flat({ industry_code: "C26" });
    expect(evaluateGroup(and(cond("industry_code", "eq", "C")), p)).toBe("pass");
    expect(evaluateGroup(and(cond("industry_code", "eq", "C10")), p)).toBe("fail");
    expect(evaluateGroup(and(cond("industry_code", "in", ["C", "G", "I"])), p)).toBe("pass");
    expect(evaluateGroup(and(cond("industry_code", "in", ["G", "I"])), p)).toBe("fail");
  });

  it("9. region_code in ['ALL'] → pass", () => {
    expect(evaluateGroup(and(cond("region_code", "in", ["ALL"])), flat({ region_code: "46" }))).toBe("pass");
  });

  it("10. 빈 조건 → check 1행 (자동 pass 금지)", () => {
    const v = evaluateProgram(program({ eligibility: and() }), flat(), TODAY);
    expect(v.overall).toBe("needs_check");
    expect(v.criteria).toHaveLength(1);
    expect(v.criteria[0].required).toContain("자격 요건 정보 없음");
  });

  it("OR 그룹은 요건표에서 행 1개로 합쳐진다", () => {
    const p = program({
      eligibility: and(
        cond("region_code", "in", ["29"], "광주 소재"),
        or(cond("ceo_age", "lte", 39, "만 39세 이하"), cond("hiring_planned", "eq", true, "청년 채용 예정")),
      ),
    });
    const v = evaluateProgram(p, flat(), TODAY);
    expect(v.criteria).toHaveLength(2);
    expect(v.criteria[1].label).toBe("대표자 연령 또는 채용 예정");
    expect(v.criteria[1].required).toBe("만 39세 이하 또는 청년 채용 예정");
    expect(v.criteria[1].state).toBe("pass");
  });
});

describe("evaluate — near-miss", () => {
  it("11. employee_count gte 5 vs 4 → '1명 충원'", () => {
    const p = program({ eligibility: and(cond("employee_count", "gte", 5), cond("employee_count", "lt", 10)) });
    const v = evaluateProgram(p, flat({ employee_count: 4 }), TODAY);
    expect(v.overall).toBe("ineligible");
    expect(v.nearMiss?.field).toBe("employee_count");
    expect(v.nearMiss?.message).toBe("상시근로자 5인 이상 조건 — 현재 4인. 1명 충원 시 자격 충족");
  });

  it("12. business_age_months gte 36 vs 35 → 자격 발생 날짜 메시지, gt 36이면 임계 37", () => {
    const gte = evaluateProgram(program({ eligibility: and(cond("business_age_months", "gte", 36)) }), flat(), TODAY);
    expect(gte.overall).toBe("ineligible");
    // founded = today − 35개월 5일 → 36개월 도달일은 약 25일 뒤
    expect(gte.nearMiss?.message).toBe("업력 3년 이상 조건 — 현재 2년 11개월. 2026.09.28부터 자격 발생");

    const gt = evaluateProgram(program({ eligibility: and(cond("business_age_months", "gt", 36)) }), flat(), TODAY);
    expect(gt.nearMiss?.message).toContain("업력 3년 1개월 이상 조건");
  });

  it("13. business_age_months gte 36 vs 14 (22개월 남음) → nearMiss null", () => {
    const p = program({ eligibility: and(cond("business_age_months", "gte", 36)) });
    const v = evaluateProgram(p, flat({ founded_at: "-14m" }), TODAY);
    expect(v.overall).toBe("ineligible");
    expect(v.nearMiss).toBeNull();
  });

  it("14. fail 2개 → nearMiss null", () => {
    const p = program({
      eligibility: and(cond("employee_count", "gte", 5), cond("ceo_gender", "eq", "female")),
    });
    const v = evaluateProgram(p, flat({ employee_count: 4 }), TODAY);
    expect(v.nearMiss).toBeNull();
  });

  it("15. ceo_age lte 39 vs 46 (상한 초과) → nearMiss null", () => {
    const p = program({ eligibility: and(cond("ceo_age", "lte", 39)) });
    const v = evaluateProgram(p, flat({ ceo_birth_date: "-46y" }), TODAY);
    expect(v.overall).toBe("ineligible");
    expect(v.nearMiss).toBeNull();
  });

  it("16. certifications includes venture 미보유 → near-miss (acquirable)", () => {
    const p = program({ eligibility: and(cond("certifications", "includes", "venture")) });
    const v = evaluateProgram(p, flat({ certifications: [] }), TODAY);
    expect(v.nearMiss?.field).toBe("certifications");
    expect(v.nearMiss?.message).toBe("벤처기업 인증 보유 조건 — 미보유. 인증 취득 시 자격 충족");
  });

  it("near-miss는 check 행이 함께 있어도 성립한다", () => {
    const p = program({
      eligibility: and(cond("employee_count", "gte", 5), cond("annual_revenue_krw", "lte", 100)),
    });
    const v = evaluateProgram(p, flat({ employee_count: 4, annual_revenue_krw: null }), TODAY);
    expect(v.overall).toBe("ineligible");
    expect(v.nearMiss?.field).toBe("employee_count");
  });
});

describe("파싱 전 실수집 공고", () => {
  const regionOnly = and(cond("region_code", "in", ["29"], "광주 소재 기업"));

  it("지역 조건만 통과해도 needs_check로 둔다", () => {
    const p = program({ is_synthetic: false, parsed_at: null, summary: null, eligibility: regionOnly, unmapped_conditions: [] });
    const v = evaluateProgram(p, flat({ region_code: "29" }), TODAY);
    expect(v.overall).toBe("needs_check");
    expect(v.criteria.some((c) => c.required.includes("AI 파싱 전"))).toBe(true);
  });

  it("파싱이 끝났으면 그대로 판정한다", () => {
    const p = program({ is_synthetic: false, parsed_at: "2026-09-01T00:00:00Z", eligibility: regionOnly, unmapped_conditions: [] });
    expect(evaluateProgram(p, flat({ region_code: "29" }), TODAY).overall).toBe("eligible");
  });

  it("재파싱 대기 중(parsed_at 없음·이전 요약 있음)인 공고는 이전 결과로 판정한다", () => {
    const p = program({ is_synthetic: false, parsed_at: null, summary: "이전 파싱 요약", eligibility: regionOnly, unmapped_conditions: [] });
    expect(evaluateProgram(p, flat({ region_code: "29" }), TODAY).overall).toBe("eligible");
  });

  it("합성(시드) 공고는 parsed_at이 없어도 영향받지 않는다", () => {
    const p = program({ is_synthetic: true, parsed_at: null, eligibility: regionOnly, unmapped_conditions: [] });
    expect(evaluateProgram(p, flat({ region_code: "29" }), TODAY).overall).toBe("eligible");
  });
});
