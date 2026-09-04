// lib/ai/geminiSchemas.ts — AI 보조 기능 4종의 출력 스키마 (zod 하나로 정의, JSON Schema는 파생)
// Gemini responseJsonSchema는 nullable을 anyOf로 받으므로 되도록 ""(빈 문자열)로 "모름"을 표현한다.

import { z } from "zod";

// ─── 1. 요건 코치 ─────────────────────────────────────────────────────────────
export const CoachOutputZ = z.object({
  summary: z.string().describe("전체 상황을 창업 초보자에게 2~3문장으로. 판정 결과를 바꾸거나 예측하지 않는다"),
  items: z.array(
    z.object({
      requirement: z.string().describe("요건을 한 줄로 (원문 표현 유지)"),
      meaning: z.string().describe("이 요건이 무슨 뜻인지 쉬운 말로. 3문장 이내"),
      how_to_meet: z.array(z.string()).describe("충족하려면 할 일. 행동 단계 2~4개"),
      where_to_check: z.string().describe("확인·신청할 기관이나 시스템 이름. 모르면 빈 문자열. URL은 만들지 않는다"),
      caution: z.string().describe("시간·비용·자격 소멸 등 주의할 점. 없으면 빈 문자열"),
      can_fix_now: z.boolean().describe("지금 행동(인증 취득·신고·서류)으로 바꿀 수 있으면 true, 시간이 지나야 하거나 바꿀 수 없으면 false"),
    }),
  ),
  next_step: z.string().describe("오늘 바로 할 수 있는 첫 행동 한 문장"),
});
export type CoachOutput = z.infer<typeof CoachOutputZ>;

// ─── 2. 신청서 뼈대 ───────────────────────────────────────────────────────────
/** 템플릿이 {{키}}로 참조할 수 있는 프리필 키. 값은 브라우저에서 프로필로 채운다 — 서버는 프로필을 모른다 (§0.1-4) */
export const PREFILL_KEYS = [
  "company_name", "biz_no", "business_type", "industry", "region", "founded_at",
  "business_age", "employee_count", "ceo_age", "annual_revenue", "certifications", "business_direction",
] as const;
export type PrefillKey = (typeof PREFILL_KEYS)[number];

export const PREFILL_LABEL: Record<PrefillKey, string> = {
  company_name: "회사명", biz_no: "사업자번호", business_type: "사업자 형태", industry: "업종", region: "소재지",
  founded_at: "개업일", business_age: "업력", employee_count: "상시근로자 수", ceo_age: "대표자 연령",
  annual_revenue: "연매출", certifications: "보유 인증", business_direction: "사업 방향",
};

export const DraftOutputZ = z.object({
  title: z.string().describe("신청서 제목. 예: 2026년 초기창업패키지 사업계획서"),
  overview: z.string().describe("이 공고에서 심사위원이 무엇을 보는지 2~3문장 (존댓말)"),
  evaluation_criteria: z.array(
    z.object({
      name: z.string().describe("평가항목명"),
      weight_text: z.string().describe("배점 문구. 공고에 없으면 '공고 미기재'"),
      what_to_show: z.string().describe("이 항목에서 보여줘야 할 것 1~2문장"),
    }),
  ),
  sections: z.array(
    z.object({
      heading: z.string().describe("목차 제목. 예: 1. 기업 개요"),
      purpose: z.string().describe("이 항목의 목적 1문장"),
      template: z.string().describe("문단 뼈대. 회사 정보는 {{프리필키}}, 사용자가 쓸 곳은 [[안내문]]. 사실을 지어내지 않는다"),
      tips: z.array(z.string()).describe("심사위원 확인 포인트·흔한 감점 요인 1~3개"),
    }),
  ),
  documents: z.array(
    z.object({
      name: z.string().describe("제출 서류명. 공고 원문 표기"),
      is_required: z.boolean(),
      note: z.string().describe("발급처·주의. 모르면 빈 문자열"),
    }),
  ),
  warnings: z.array(z.string()).describe("마감·제출 방식·중복 수혜 제한 등 놓치기 쉬운 것"),
});
export type DraftOutput = z.infer<typeof DraftOutputZ>;

// ─── 3. 대화형 온보딩 ─────────────────────────────────────────────────────────
const CERTS = ["venture", "innobiz", "mainbiz", "research_institute", "social_enterprise", "women_enterprise", "disabled_enterprise"] as const;
const TRI = ["true", "false", ""] as const; // "" = 모름

export const InterviewExtractedZ = z.object({
  name: z.string().describe("회사명. 모르면 빈 문자열"),
  business_type: z.enum(["individual", "corporation", ""]).describe("개인사업자 individual · 법인 corporation · 모르면 빈 문자열"),
  industry_code: z.string().describe("업종 코드표의 코드만. 모르면 빈 문자열"),
  region_code: z.string().describe("지역 코드표의 코드만. 모르면 빈 문자열"),
  founded_at: z.string().describe("개업일 YYYY-MM-DD. 연·월만 알면 01일. 모르면 빈 문자열"),
  employee_count: z.string().describe("상시근로자 수(대표 제외) 정수 문자열. 모르면 빈 문자열"),
  ceo_birth_date: z.string().describe("대표자 생년월일 YYYY-MM-DD. 연도만 알면 YYYY-01-01. 모르면 빈 문자열"),
  ceo_gender: z.enum(["male", "female", ""]),
  annual_revenue_eok: z.string().describe("연매출 억원 단위 숫자 문자열. 예 '3.5'. 모르면 빈 문자열"),
  hiring_planned: z.enum(TRI),
  has_online_sales: z.enum(TRI),
  handles_personal_data: z.enum(TRI),
  is_food_business: z.enum(TRI),
  certifications: z.array(z.enum(CERTS)).describe("사용자가 보유한다고 말한 인증만"),
  business_direction: z.string().describe("창업가가 말한 사업 방향·계획·고민. 사용자 표현 위주. 모르면 빈 문자열"),
});
export type InterviewExtractedRaw = z.infer<typeof InterviewExtractedZ>;

export const InterviewOutputZ = z.object({
  reply: z.string().describe("사용자에게 보낼 다음 말. 질문 하나만. 2문장 이내"),
  done: z.boolean().describe("필수 항목과 사업 방향이 채워져 마무리했으면 true"),
  extracted: InterviewExtractedZ.describe("지금까지 대화 전체에서 파악한 값을 누적해 매번 전부 채운다"),
});
export type InterviewOutput = z.infer<typeof InterviewOutputZ>;

// ─── 4. 현금흐름 해설 ─────────────────────────────────────────────────────────
export const CashflowInsightZ = z.object({
  headline: z.string().describe("대표가 가장 먼저 봐야 할 한 문장. 숫자 포함"),
  insights: z.array(
    z.object({
      title: z.string().describe("10자 내외"),
      detail: z.string().describe("2~3문장. 근거 숫자를 인용한다"),
      severity: z.enum(["good", "watch", "risk"]),
      action: z.string().describe("이번 주에 할 수 있는 행동 1개"),
    }),
  ),
  questions_for_accountant: z.array(z.string()).describe("세무사·회계사에게 물어볼 질문 2~3개"),
});
export type CashflowInsight = z.infer<typeof CashflowInsightZ>;
