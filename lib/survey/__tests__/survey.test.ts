import { describe, expect, it } from "vitest";

import { loadSeedCatalog } from "@/lib/data/seedRepository";
import {
  EMPTY_ANSWERS,
  answersFromProfile,
  answersToProfile,
  birthError,
  foundedError,
  isBroadIndustry,
  missingRequired,
  preview,
  programsUsing,
  searchIndustries,
  type Answers,
} from "@/lib/survey/survey";

import { TODAY, profile } from "@/lib/engine/__tests__/helpers";

const base = { id: "p1", created_at: "2026-09-03T00:00:00.000Z", biz_no: "123-45-67890" };
const REQUIRED_OK: Answers = {
  ...EMPTY_ANSWERS, business_type: "corporation", industry_code: "J62", region_code: "29", founded_at: "2024-03-01", employee_count: 4,
};
const { programs } = loadSeedCatalog(TODAY);

describe("필수 항목", () => {
  it("비어 있으면 라벨로 알려주고 프로필을 만들지 않는다", () => {
    expect(missingRequired(EMPTY_ANSWERS)).toEqual(["사업자 형태", "업종", "지역", "개업일", "상시근로자 수"]);
    expect(answersToProfile(EMPTY_ANSWERS, base)).toBeNull();
  });

  it("직원 0명은 답이다 (빈 값이 아니다)", () => {
    expect(missingRequired({ ...REQUIRED_OK, employee_count: 0 })).toEqual([]);
  });
});

describe("답 → 프로필", () => {
  it("모름은 null로, 없음은 0/[]로 구분해 저장한다", () => {
    const p = answersToProfile({ ...REQUIRED_OK, revenue_eok: "", export_usd: "0", prior_support: [], has_tax_arrears: null }, base)!;
    expect(p.annual_revenue_krw).toBeNull();
    expect(p.export_revenue_usd_prev_year).toBe(0);
    expect(p.prior_support).toEqual([]);
    expect(p.has_tax_arrears).toBeNull();
  });

  it("억원 단위 매출을 원으로 바꾸고, 이름이 없으면 '내 회사'", () => {
    const p = answersToProfile({ ...REQUIRED_OK, revenue_eok: "3.2" }, base)!;
    expect(p.annual_revenue_krw).toBe(320_000_000);
    expect(p.name).toBe("내 회사");
    expect(p.industry_label).toBe("소프트웨어 개발업");
    expect(p.biz_no).toBe("123-45-67890");
  });

  it("프로필 → 답 → 프로필이 같은 값을 돌려준다 (수정 모드)", () => {
    const original = profile({ has_tax_arrears: false, prior_support: ["tips"], business_direction: "재고 관리 SaaS" });
    const back = answersToProfile(answersFromProfile(original), { id: original.id, created_at: original.created_at, biz_no: original.biz_no })!;
    expect({ ...back, updated_at: "" }).toEqual({ ...original, updated_at: "" });
  });
});

describe("검증", () => {
  it("개업일: 미래·형식 오류·너무 옛날", () => {
    expect(foundedError("2026-09-04", TODAY)).toMatch(/미래/);
    expect(foundedError("2026-02-30", TODAY)).toMatch(/형식/);
    expect(foundedError("1900-01-01", TODAY)).toMatch(/1950/);
    expect(foundedError("2024-01-01", TODAY)).toBeNull();
  });

  it("생년월일: 만 15~100세만", () => {
    expect(birthError("2020-01-01", TODAY)).not.toBeNull();
    expect(birthError("1990-05-01", TODAY)).toBeNull();
    expect(birthError(null, TODAY)).toBeNull();
  });
});

describe("업종 검색", () => {
  it("일상어로 찾는다", () => {
    expect(searchIndustries("카페").map((i) => i.code)).toContain("I5622");
    expect(searchIndustries("쇼핑몰").map((i) => i.code)).toContain("G47");
    expect(searchIndustries("소프트웨어").map((i) => i.code)).toContain("J62");
  });

  it("세부 업종이 있는 넓은 코드를 알아본다", () => {
    expect(isBroadIndustry("I56")).toBe(true);
    expect(isBroadIndustry("I")).toBe(true);
    expect(isBroadIndustry("I5622")).toBe(false);
    expect(isBroadIndustry("")).toBe(false);
  });
});

describe("판정 미리보기", () => {
  it("필수 5개 전에는 없다", () => {
    expect(preview(EMPTY_ANSWERS, programs, TODAY)).toBeNull();
  });

  it("체납을 모르면 확인 필요가 생기고, '세금 체납 여부'가 가장 많은 공고를 푼다", () => {
    const pv = preview({ ...REQUIRED_OK, prior_support: [] }, programs, TODAY)!;
    expect(pv.needsCheck).toBeGreaterThan(0);
    expect(pv.unlock[0].input).toBe("세금 체납 여부");
    expect(pv.eligible + pv.conditional + pv.ineligible + pv.needsCheck).toBe(programs.length);
  });

  it("체납 없음을 답하면 대상이 늘어난다", () => {
    const before = preview({ ...REQUIRED_OK, prior_support: [] }, programs, TODAY)!;
    const after = preview({ ...REQUIRED_OK, prior_support: [], has_tax_arrears: false }, programs, TODAY)!;
    expect(after.eligible).toBeGreaterThan(before.eligible);
    expect(after.unlock.find((u) => u.input === "세금 체납 여부")).toBeUndefined();
  });
});

describe("질문이 쓰이는 공고 수", () => {
  it("체납은 대부분의 공고에, 자격과 무관한 질문은 0건", () => {
    expect(programsUsing(["has_tax_arrears"], programs)).toBe(18);
    expect(programsUsing([], programs)).toBe(0);
  });
});
