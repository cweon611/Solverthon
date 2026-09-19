// 정답 사례 — "이 회사가 이 공고를 보면 판정이 무엇이어야 하는가"를 사람이 공개 규정을 근거로 적어 둔 표.
// 테스트(gold.test.ts)와 리포트(scripts/match-report.ts)가 같이 쓴다.
//
// 한계: 정답은 엔진을 만든 쪽이 공개 규정(법령·통상적 공고 문구)을 읽고 붙인 것이다.
// 독립 평가자가 붙인 정답이 아니므로 "정확도"가 아니라 "규정 준수 검사"로 읽어야 한다.
// 사례를 늘릴 때는 why에 근거를 반드시 적는다.

import type { Verdict } from "@/lib/engine/evaluate";
import type { PriorSupport } from "@/lib/types";

import { profile } from "./helpers";

type ProfileInput = Parameters<typeof profile>[0];

export interface GoldCase {
  id: string;
  programId: string;
  who: string; // 사람용 한 줄
  input: ProfileInput;
  expected: Verdict;
  why: string;
}

// 기준 회사: 광주 소프트웨어 법인 · 업력 약 2년 11개월 · 4인 · 대표 만 39세 · 체납 없음 · 수혜 이력 없음
const OK: { has_tax_arrears: boolean; prior_support: PriorSupport[] } = { has_tax_arrears: false, prior_support: [] };

export const GOLD_CASES: GoldCase[] = [
  // ── 창업 제외 업종 (「중소기업창업 지원법」 시행령 제4조) ──
  { id: "G01", programId: "seed-01", who: "부동산 임대업 창업 1년차", input: { ...OK, industry_code: "L", founded_at: "-12m" }, expected: "ineligible",
    why: "부동산업은 창업 지원 제외 업종이다." },
  { id: "G02", programId: "seed-01", who: "보험대리점 창업 1년차", input: { ...OK, industry_code: "K", founded_at: "-12m" }, expected: "ineligible",
    why: "금융 및 보험업은 창업 지원 제외 업종이다." },
  { id: "G03", programId: "seed-01", who: "주점 창업 (유흥 여부 모름)", input: { ...OK, industry_code: "I5621", founded_at: "-12m" }, expected: "needs_check",
    why: "주점업 중 유흥주점만 제외된다. 세부 업종을 모르면 단정할 수 없다." },
  { id: "G04", programId: "seed-01", who: "카페 창업 1년차", input: { ...OK, industry_code: "I5622", founded_at: "-12m", employee_count: 1 }, expected: "eligible",
    why: "비알코올 음료점업은 제외 업종이 아니다." },
  { id: "G05", programId: "seed-01", who: "소프트웨어 창업 1년차", input: { ...OK, founded_at: "-12m" }, expected: "eligible",
    why: "업력 3년 이내 · 제외 업종 아님 · 체납·기수혜 없음." },

  // ── 공통 제외: 체납 ──
  { id: "G06", programId: "seed-10", who: "체납 중인 기술 창업기업", input: { ...OK, has_tax_arrears: true }, expected: "ineligible",
    why: "국세·지방세 체납 기업은 보증·보조 사업에서 제외된다." },
  { id: "G07", programId: "seed-10", who: "체납 여부를 답하지 않은 기업", input: { has_tax_arrears: null, prior_support: [] }, expected: "needs_check",
    why: "모르는 값으로 제외하지 않는다 (§0.1-7)." },
  { id: "G08", programId: "seed-10", who: "체납 없는 기술 창업기업", input: { ...OK }, expected: "eligible",
    why: "업력 7년 이내 · 체납 없음." },

  // ── 중복수혜 제한 · 수혜 이력 요건 ──
  { id: "G09", programId: "seed-01", who: "초기창업패키지를 이미 받은 기업", input: { ...OK, founded_at: "-20m", prior_support: ["early_startup_pkg"] }, expected: "ineligible",
    why: "같은 사업 기수혜 기업은 재신청할 수 없다." },
  { id: "G10", programId: "seed-01", who: "예비창업패키지 졸업 후 창업 1년차", input: { ...OK, founded_at: "-12m", prior_support: ["pre_startup_pkg"] }, expected: "eligible",
    why: "예비→초기는 단계가 다른 사업이다. 이 시드 공고는 초기창업패키지 기수혜만 제한한다." },
  { id: "G11", programId: "seed-23", who: "청년창업사관학교 졸업기업", input: { ...OK, prior_support: ["youth_academy"] }, expected: "eligible",
    why: "졸업기업 한정 사업이며 업력 7년 이내." },
  { id: "G12", programId: "seed-23", who: "사관학교 이력 없는 기업", input: { ...OK }, expected: "ineligible",
    why: "졸업기업에 한한다." },
  { id: "G13", programId: "seed-03", who: "청년창업사관학교 기입교 기업", input: { ...OK, founded_at: "-12m", prior_support: ["youth_academy"] }, expected: "ineligible",
    why: "입교 이력이 있으면 재입교할 수 없다." },

  // ── 소상공인 정의 (「소상공인기본법」 시행령 제2조) ──
  { id: "G14", programId: "seed-09", who: "소프트웨어 4인", input: { ...OK, employee_count: 4 }, expected: "eligible",
    why: "그 밖의 업종 5명 미만 → 소상공인." },
  { id: "G15", programId: "seed-09", who: "소프트웨어 7인", input: { ...OK, employee_count: 7 }, expected: "ineligible",
    why: "그 밖의 업종은 5명 미만이어야 한다." },
  { id: "G16", programId: "seed-09", who: "제조업 7인", input: { ...OK, industry_code: "C26", employee_count: 7 }, expected: "eligible",
    why: "제조업은 10명 미만이면 소상공인." },
  { id: "G17", programId: "seed-09", who: "운수업 8인", input: { ...OK, industry_code: "H", employee_count: 8 }, expected: "eligible",
    why: "운수업은 10명 미만이면 소상공인." },
  { id: "G18", programId: "seed-09", who: "부동산 중개 2인", input: { ...OK, industry_code: "L", employee_count: 2 }, expected: "ineligible",
    why: "부동산업은 정책자금 제외 업종." },

  // ── 소공인 (「도시형소공인 지원에 관한 특별법」 제2조) ──
  { id: "G19", programId: "seed-19", who: "식품 제조 3인", input: { ...OK, industry_code: "C10", employee_count: 3 }, expected: "eligible",
    why: "제조업 · 10명 미만." },
  { id: "G20", programId: "seed-19", who: "소프트웨어 3인", input: { ...OK, employee_count: 3 }, expected: "ineligible",
    why: "제조업이 아니다." },

  // ── 업종을 대분류로만 안 경우 ──
  { id: "G21", programId: "seed-19", who: "업종을 '제조업'으로만 입력", input: { ...OK, industry_code: "C", employee_count: 3 }, expected: "eligible",
    why: "조건이 대분류(C)라 대분류 입력으로 확정된다." },
  { id: "G22", programId: "seed-01", who: "업종을 '숙박·음식점업'으로만 입력", input: { ...OK, industry_code: "I", founded_at: "-12m" }, expected: "needs_check",
    why: "유흥주점 해당 여부를 알 수 없다." },

  // ── 연령·지역·업력 ──
  { id: "G23", programId: "seed-03", who: "대표 만 45세, 업력 1년", input: { ...OK, founded_at: "-12m", ceo_birth_date: "-45y" }, expected: "ineligible",
    why: "만 39세 이하 한정." },
  { id: "G24", programId: "seed-15", who: "서울 소재 청년 대표", input: { ...OK, region_code: "11" }, expected: "ineligible",
    why: "광주 소재 기업 한정." },
  { id: "G25", programId: "seed-02", who: "업력 5년 기업", input: { ...OK, founded_at: "-60m" }, expected: "eligible",
    why: "업력 3~7년 · 도약패키지 기수혜 없음." },
  { id: "G26", programId: "seed-02", who: "업력 8년 기업", input: { ...OK, founded_at: "-96m" }, expected: "ineligible",
    why: "창업기업(7년 이내)이 아니다." },
];
