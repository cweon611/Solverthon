// lib/ai/schema.ts — 파서 출력 스키마 (§7.1)
// zod 하나로 정의하고 JSON Schema는 SDK의 zodOutputFormat이 파생시킨다.
// structured outputs는 minimum/maximum/maxLength/pattern/format을 지원하지 않으므로
// 그런 제약은 전부 .describe()에 문장으로 쓴다.

import { z } from "zod";

import { CONDITION_FIELDS } from "@/lib/constants";
import type { ConditionField, Operator } from "@/lib/types";

const FIELD_VALUES = CONDITION_FIELDS as [ConditionField, ...ConditionField[]];
const OPERATORS = ["lt", "lte", "gt", "gte", "eq", "neq", "in", "not_in", "includes"] as const satisfies readonly Operator[];
const SUPPORT_FIELDS = ["창업", "R&D", "수출", "고용", "금융", "내수", "경영", "기타"] as const;

/** 파서가 뱉는 조건 1개. value는 항상 문자열로 받고 후처리에서 타입을 맞춘다 */
export const ParsedConditionZ = z.object({
  field: z.enum(FIELD_VALUES).describe("조건이 가리키는 프로필 항목"),
  op: z.enum(OPERATORS).describe("비교 연산자. 이상은 gte, 초과는 gt, 이하는 lte, 미만은 lt"),
  value: z.string().describe("비교 값. 숫자도 문자열로 적는다. in/not_in은 쉼표로 구분한다"),
  label: z.string().describe("사용자에게 보여줄 요건 문구. 예: 업력 3년 이상 7년 이하"),
  source_text: z.string().describe("이 조건의 근거가 된 공고 원문 문장 그대로"),
});

export const ParsedAnnouncementZ = z.object({
  title: z.string().describe("공고명"),
  organization: z.string().describe("공고 기관"),
  executing_org: z.string().nullable().describe("수행 기관. 없으면 null"),
  support_field: z.enum(SUPPORT_FIELDS).describe("지원 분야"),
  support_type: z.string().nullable().describe("지원 형태. 예: 사업화 자금 + 멘토링"),
  amount_text: z.string().nullable().describe("지원 규모 문구. 예: 최대 3억원"),
  summary: z.string().describe("공고 요약. 200자 이내"),
  apply_start: z.string().nullable().describe("접수 시작일. YYYY-MM-DD 형식. 없으면 null"),
  apply_end: z.string().nullable().describe("접수 마감일. YYYY-MM-DD 형식. 상시 접수면 null"),
  is_rolling: z.boolean().describe("상시 접수이거나 예산 소진 시까지면 true"),
  conditions: z.array(ParsedConditionZ).describe("모두 동시에 만족해야 하는 조건들(AND)"),
  alternatives: z
    .array(
      z.object({
        label: z.string().describe("이 선택 묶음의 이름. 예: 다음 중 하나에 해당"),
        conditions: z.array(ParsedConditionZ).describe("서로 택일 관계인 조건들(OR)"),
      }),
    )
    .describe("'다음 중 하나에 해당' 같은 선택 조건 묶음. 묶음끼리는 AND"),
  unmapped_conditions: z
    .array(
      z.object({
        text: z.string().describe("매핑하지 못한 조건의 원문"),
        reason: z.string().describe("매핑하지 못한 이유"),
      }),
    )
    .describe("field 목록에 매핑할 수 없는 조건들"),
  required_documents: z
    .array(
      z.object({
        name: z.string().describe("서류명. 원문 표기 그대로"),
        source_text: z.string().describe("근거가 된 원문 문장"),
        is_required: z.boolean().describe("필수면 true, 선택이면 false"),
      }),
    )
    .describe("제출 서류. 발급 소요기간은 추정하지 않는다"),
  confidence: z.number().describe("전체 추출의 확신도. 0에서 1 사이 소수"),
});

export type ParsedCondition = z.infer<typeof ParsedConditionZ>;
export type ParsedAnnouncement = z.infer<typeof ParsedAnnouncementZ>;
