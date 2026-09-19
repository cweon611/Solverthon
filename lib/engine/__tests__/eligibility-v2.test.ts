// 자격 분류 고도화 — 업종 세분화 모호성 · 체납/수혜 이력 · 입력 안내 · 상위 근거 · 맞춤도

import { describe, expect, it } from "vitest";

import { evaluateCondition, evaluateProgram, toFlatProfile } from "@/lib/engine/evaluate";
import { computeFit, targetingWeight } from "@/lib/engine/rank";
import { entropyBits, fieldSensitivity, hamming } from "@/lib/engine/sensitivity";

import { TODAY, and, cond, or, profile, program } from "./helpers";

const flat = (o?: Parameters<typeof profile>[0]) => toFlatProfile(profile(o), TODAY);
const EXCLUDED = ["K", "L", "I56211", "I56212", "R91249"];

describe("업종 — 프로필이 조건보다 덜 구체적이면 확인 필요", () => {
  it("제외 업종(not_in): 부동산업은 fail, 소프트웨어는 pass", () => {
    const c = cond("industry_code", "not_in", EXCLUDED);
    expect(evaluateCondition(c, flat({ industry_code: "L" }))).toBe("fail");
    expect(evaluateCondition(c, flat({ industry_code: "J62" }))).toBe("pass");
  });

  it("제외 업종(not_in): '주점업'만 고른 사용자는 유흥주점인지 알 수 없다 → check", () => {
    const c = cond("industry_code", "not_in", EXCLUDED);
    expect(evaluateCondition(c, flat({ industry_code: "I5621" }))).toBe("check");
    expect(evaluateCondition(c, flat({ industry_code: "I56" }))).toBe("check");
    // 카페(I5622)는 유흥주점(I56211)과 갈래가 달라 확정 가능
    expect(evaluateCondition(c, flat({ industry_code: "I5622" }))).toBe("pass");
  });

  it("업종 한정(in): 대분류만 고르면 중분류 한정 조건은 check (예전에는 조용히 fail)", () => {
    const c = cond("industry_code", "in", ["J62"]);
    expect(evaluateCondition(c, flat({ industry_code: "J" }))).toBe("check");
    expect(evaluateCondition(c, flat({ industry_code: "J62" }))).toBe("pass");
    expect(evaluateCondition(c, flat({ industry_code: "C26" }))).toBe("fail");
  });

  it("eq도 같은 규칙", () => {
    expect(evaluateCondition(cond("industry_code", "eq", "C"), flat({ industry_code: "C26" }))).toBe("pass");
    expect(evaluateCondition(cond("industry_code", "eq", "C26"), flat({ industry_code: "C" }))).toBe("check");
    expect(evaluateCondition(cond("industry_code", "neq", "C26"), flat({ industry_code: "C" }))).toBe("check");
  });
});

describe("세금 체납 · 이전 수혜 이력 (3-state)", () => {
  const tax = cond("has_tax_arrears", "eq", false, "국세·지방세 체납 없음");

  it("체납 없음 pass · 있음 fail · 모름 check (§0.1-7: 모르면 절대 fail이 아니다)", () => {
    expect(evaluateCondition(tax, flat({ has_tax_arrears: false }))).toBe("pass");
    expect(evaluateCondition(tax, flat({ has_tax_arrears: true }))).toBe("fail");
    expect(evaluateCondition(tax, flat({ has_tax_arrears: null }))).toBe("check");
  });

  it("구버전 프로필(필드 없음)은 모름으로 읽는다", () => {
    const p = profile();
    delete (p as { has_tax_arrears?: unknown }).has_tax_arrears;
    delete (p as { prior_support?: unknown }).prior_support;
    const f = toFlatProfile(p, TODAY);
    expect(f.has_tax_arrears).toBeNull();
    expect(f.prior_support).toBeNull();
  });

  it("중복수혜 제한(not_in)과 졸업기업 한정(includes)", () => {
    const notAgain = cond("prior_support", "not_in", ["early_startup_pkg"]);
    const gradOnly = cond("prior_support", "includes", "youth_academy");
    expect(evaluateCondition(notAgain, flat({ prior_support: [] }))).toBe("pass");
    expect(evaluateCondition(notAgain, flat({ prior_support: ["early_startup_pkg"] }))).toBe("fail");
    expect(evaluateCondition(notAgain, flat({ prior_support: null }))).toBe("check");
    expect(evaluateCondition(gradOnly, flat({ prior_support: ["youth_academy"] }))).toBe("pass");
    expect(evaluateCondition(gradOnly, flat({ prior_support: [] }))).toBe("fail");
  });

  it("값 표시", () => {
    const p = program({ eligibility: and(tax, cond("prior_support", "not_in", ["tips"])) });
    const v = evaluateProgram(p, flat({ has_tax_arrears: false, prior_support: ["tips", "youth_academy"] }), TODAY);
    expect(v.criteria[0].current).toBe("체납 없음");
    expect(v.criteria[1].current).toBe("TIPS, 청년창업사관학교");
  });
});

describe("확인 필요 행 — 무엇을 입력하면 확정되는가", () => {
  it("비어 있는 필드는 입력 항목 이름을 알려준다", () => {
    const p = program({
      eligibility: and(
        cond("ceo_age", "lte", 39),
        cond("has_tax_arrears", "eq", false),
        cond("industry_code", "not_in", EXCLUDED),
        cond("employee_count", "lt", 10),
      ),
    });
    const v = evaluateProgram(p, flat({ ceo_birth_date: null, has_tax_arrears: null, industry_code: "I56" }), TODAY);
    expect(v.criteria.map((c) => c.missingInput)).toEqual(["대표자 생년월일", "세금 체납 여부", "세부 업종", undefined]);
  });

  it("OR 그룹의 확인 필요도 입력 항목을 알려준다", () => {
    const p = program({ eligibility: and(or(cond("ceo_age", "lte", 39), cond("ceo_gender", "eq", "female"))) });
    const v = evaluateProgram(p, flat({ ceo_birth_date: null, ceo_gender: "male" }), TODAY);
    expect(v.criteria[0].state).toBe("check");
    expect(v.criteria[0].missingInput).toBe("대표자 생년월일");
  });
});

describe("상위 근거(basis)는 판정표 행까지 전달된다", () => {
  it("리프와 OR 그룹 모두", () => {
    const basis = { kind: "law" as const, ref: "「소상공인기본법」 시행령 제2조", checked_at: null };
    const leaf = { ...cond("employee_count", "lt", 5), basis };
    const p = program({ eligibility: and(leaf, or({ ...cond("employee_count", "lt", 10), basis }, cond("region_code", "in", ["29"]))) });
    const v = evaluateProgram(p, flat(), TODAY);
    expect(v.criteria[0].basis?.ref).toBe(basis.ref);
    expect(v.criteria[1].basis?.ref).toBe(basis.ref);
  });
});

describe("맞춤도 (rank.ts)", () => {
  it("위생 조건(업력 7년·체납 없음·제외 업종)은 점수가 없다", () => {
    expect(targetingWeight(cond("business_age_months", "lte", 84)).weight).toBe(0);
    expect(targetingWeight(cond("has_tax_arrears", "eq", false)).weight).toBe(0);
    expect(targetingWeight(cond("industry_code", "not_in", EXCLUDED)).weight).toBe(0);
  });

  it("대상을 좁히는 조건을 통과할수록 점수가 높다", () => {
    const f = flat();
    const generic = program({ id: "G", eligibility: and(cond("business_age_months", "lte", 84), cond("has_tax_arrears", "eq", false)) });
    const local = program({ id: "L", eligibility: and(cond("region_code", "in", ["29"], "광주 소재"), cond("ceo_age", "lte", 39, "만 39세 이하")) });
    const fg = computeFit(generic, evaluateProgram(generic, { ...f, has_tax_arrears: false }, TODAY), { ...f, has_tax_arrears: false });
    const fl = computeFit(local, evaluateProgram(local, f, TODAY), f);
    expect(fg.score).toBe(0);
    expect(fl.score).toBe(6);
    expect(fl.reasons).toEqual(["광주광역시 소재 기업 한정", "만 39세 이하"]);
  });

  it("대상이 아니면 0점", () => {
    const p = program({ eligibility: and(cond("region_code", "in", ["11"])) });
    expect(computeFit(p, evaluateProgram(p, flat(), TODAY), flat()).score).toBe(0);
  });

  it("OR 그룹은 통과한 선택지 중 가장 큰 것 하나만 센다", () => {
    const p = program({ eligibility: and(or(cond("region_code", "in", ["29"]), cond("ceo_age", "lte", 45))) });
    expect(computeFit(p, evaluateProgram(p, flat(), TODAY), flat()).score).toBe(3);
  });
});

describe("민감도 도구", () => {
  it("hamming · entropy", () => {
    expect(hamming(["eligible", "ineligible"], ["eligible", "needs_check"])).toBe(1);
    expect(entropyBits([1, 1])).toBeCloseTo(1);
    expect(entropyBits([4])).toBe(0);
  });

  it("업종을 부동산업으로 바꾸면 제외 업종 조건이 있는 공고만 뒤집힌다", () => {
    const programs = [
      program({ id: "A", eligibility: and(cond("industry_code", "not_in", EXCLUDED)) }),
      program({ id: "B", eligibility: and(cond("business_age_months", "lte", 84)) }),
    ];
    const [r] = fieldSensitivity(programs, [profile()], [
      { field: "업종", variants: [{ label: "부동산", patch: (p) => ({ ...p, industry_code: "L" }) }] },
    ], TODAY);
    expect(r.meanFlips).toBe(1);
    expect(r.programsAffected).toBe(0.5);
  });
});
