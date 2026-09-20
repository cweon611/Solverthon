// lib/ai/geminiSchemas.ts — AI 보조 기능 3종의 출력 스키마 (zod 하나로 정의, JSON Schema는 파생)
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
  "eligibility_summary", "company_intro",
] as const;
export type PrefillKey = (typeof PREFILL_KEYS)[number];

export const PREFILL_LABEL: Record<PrefillKey, string> = {
  company_name: "회사명", biz_no: "사업자번호", business_type: "사업자 형태", industry: "업종", region: "소재지",
  founded_at: "개업일", business_age: "업력", employee_count: "상시근로자 수", ceo_age: "대표자 연령",
  annual_revenue: "연매출", certifications: "보유 인증", business_direction: "사업 방향",
  eligibility_summary: "자격 충족 근거", company_intro: "회사 소개 문장",
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
      template: z.string().describe("문단 뼈대. 회사 정보는 {{프리필키}}, 사업 서술은 {{lib:키}}, 이 문단에만 쓸 곳은 [[안내문]]. 사실을 지어내지 않는다"),
      tips: z.array(z.string()).describe("심사위원 확인 포인트·흔한 감점 요인 1~3개"),
      criteria: z.array(z.number().int()).describe("이 문단이 다루는 evaluation_criteria의 인덱스(0부터). 없으면 빈 배열"),
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
