import { describe, expect, it } from "vitest";

import { EMPTY_EXTRACT, coerceExtracted, extractToProfile, mergeExtract, missingRequired } from "@/lib/ai/interviewCoerce";
import type { InterviewExtractedRaw } from "@/lib/ai/geminiSchemas";

const today = new Date(2026, 8, 3);
const raw: InterviewExtractedRaw = {
  name: " 테크스타트 ", business_type: "corporation", industry_code: "j62", region_code: "29",
  founded_at: "2023-10-01", employee_count: "4", ceo_birth_date: "1990-05-01", ceo_gender: "",
  annual_revenue_eok: "3.2", hiring_planned: "true", has_online_sales: "", handles_personal_data: "false",
  is_food_business: "", certifications: ["venture", "venture"], business_direction: "재고 관리 SaaS",
};

describe("interviewCoerce", () => {
  it("문자열 값을 검증·정규화한다", () => {
    const ex = coerceExtracted(raw, today);
    expect(ex.name).toBe("테크스타트");
    expect(ex.industry_code).toBe("J62");
    expect(ex.employee_count).toBe(4);
    expect(ex.annual_revenue_krw).toBe(320_000_000);
    expect(ex.hiring_planned).toBe(true);
    expect(ex.has_online_sales).toBeNull();
    expect(ex.handles_personal_data).toBe(false);
    expect(ex.certifications).toEqual(["venture"]);
  });

  it("코드표에 없는 코드·미래 날짜·음수는 버린다", () => {
    const ex = coerceExtracted({ ...raw, industry_code: "ZZ9", region_code: "99", founded_at: "2030-01-01", employee_count: "-3" }, today);
    expect(ex.industry_code).toBeNull();
    expect(ex.region_code).toBeNull();
    expect(ex.founded_at).toBeNull();
    expect(ex.employee_count).toBeNull();
  });

  it("누적 병합은 새 값이 있으면 덮고 없으면 지킨다", () => {
    const a = { ...EMPTY_EXTRACT, name: "A", region_code: "29" };
    const b = { ...EMPTY_EXTRACT, name: null, region_code: "11", certifications: ["innobiz" as const] };
    const m = mergeExtract(a, b);
    expect(m.name).toBe("A");
    expect(m.region_code).toBe("11");
    expect(m.certifications).toEqual(["innobiz"]);
  });

  it("필수 5개가 없으면 프로필을 만들지 않는다", () => {
    const ex = coerceExtracted({ ...raw, founded_at: "" }, today);
    expect(missingRequired(ex)).toEqual(["개업일"]);
    expect(extractToProfile(ex)).toBeNull();
  });

  it("필수가 있으면 프로필을 만들고 모르는 선택 항목은 null/false로 둔다", () => {
    const p = extractToProfile(coerceExtracted(raw, today))!;
    expect(p.industry_label).toBe("소프트웨어 개발업");
    expect(p.region_label).toBe("광주광역시");
    expect(p.ceo_gender).toBeNull();
    expect(p.flags.has_online_sales).toBe(false);
    expect(p.business_direction).toBe("재고 관리 SaaS");
    expect(p.export_revenue_usd_prev_year).toBeNull();
  });
});
