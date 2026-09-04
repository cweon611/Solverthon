import { describe, expect, it } from "vitest";

import { applyPrefill, buildPrefillValues, countBlanks, splitBlanks } from "@/lib/ai/prefill";
import type { CompanyProfile } from "@/lib/types";

const profile: CompanyProfile = {
  id: "p1", name: "테크스타트", biz_no: "234-86-01827", business_type: "corporation",
  industry_code: "J62", industry_label: "소프트웨어 개발업", region_code: "29", region_label: "광주광역시",
  founded_at: "2023-10-01", employee_count: 4, ceo_birth_date: "1990-05-01", ceo_gender: "male",
  annual_revenue_krw: 320_000_000, export_revenue_usd_prev_year: null, is_vat_exempt: false,
  certifications: ["venture"], flags: { hiring_planned: true, has_online_sales: false, handles_personal_data: true, is_food_business: false },
  business_direction: "중소 제조사용 재고 관리 SaaS",
  created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
};
const today = new Date(2026, 8, 3);

describe("prefill", () => {
  it("프로필에서 프리필 값을 만든다", () => {
    const v = buildPrefillValues(profile, today);
    expect(v.company_name).toBe("테크스타트");
    expect(v.business_type).toBe("법인사업자");
    expect(v.region).toBe("광주광역시");
    expect(v.business_age).toBe("2년");
    expect(v.employee_count).toBe("4명");
    expect(v.ceo_age).toBe("만 36세");
    expect(v.annual_revenue).toBe("3.2억원");
    expect(v.certifications).toBe("벤처기업 인증");
    expect(v.business_direction).toBe("중소 제조사용 재고 관리 SaaS");
  });

  it("{{키}}를 값으로 바꾸고 [[빈칸]]은 그대로 둔다", () => {
    const v = buildPrefillValues(profile, today);
    const r = applyPrefill("{{company_name}}은(는) {{region}} 소재 {{industry}} 기업으로, [[핵심 고객 문제]]를 해결합니다.", v);
    expect(r.text).toBe("테크스타트은(는) 광주광역시 소재 소프트웨어 개발업 기업으로, [[핵심 고객 문제]]를 해결합니다.");
    expect(r.filled).toEqual(["company_name", "region", "industry"]);
    expect(r.missing).toEqual([]);
  });

  it("값이 없는 키는 [[입력 필요: 라벨]]로 남긴다", () => {
    const v = buildPrefillValues({ ...profile, name: "", biz_no: null, business_direction: null }, today);
    const r = applyPrefill("{{company_name}} / {{biz_no}} / {{business_direction}} / {{unknown_key}}", v);
    expect(r.text).toBe("[[입력 필요: 회사명]] / [[입력 필요: 사업자번호]] / [[입력 필요: 사업 방향]] / [[입력 필요: unknown_key]]");
    expect(r.missing).toEqual(["회사명", "사업자번호", "사업 방향", "unknown_key"]);
  });

  it("빈칸을 세고 조각으로 나눈다", () => {
    const t = "가 [[하나]] 나 [[둘]] 다";
    expect(countBlanks(t)).toBe(2);
    expect(splitBlanks(t)).toEqual([
      { kind: "text", value: "가 " }, { kind: "blank", value: "하나" },
      { kind: "text", value: " 나 " }, { kind: "blank", value: "둘" }, { kind: "text", value: " 다" },
    ]);
  });
});
