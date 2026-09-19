// lib/engine/rank.ts — 대상 공고의 맞춤도 (결정론 · 설명 가능)
// 순수 TS. react·next·@supabase를 import하지 않는다.
//
// 판정(대상/조건부/제외)은 evaluate.ts가 끝냈다. 여기서는 "대상" 공고끼리의 순서만 정한다.
// 원칙: 누구나 통과하는 조건(업력 7년 이내, 체납 없음, 제외 업종 아님)은 점수가 없고,
// 대상을 좁히는 조건(지역 한정, 청년 대표, 업종 한정, 인증 보유 …)을 통과할수록 점수가 높다.
// 좁은 문을 통과했다 = 경쟁자가 적고, 그 회사를 위해 만든 사업일 가능성이 높다.

import { REGION_ALL, REGION_LABEL } from "@/lib/constants";
import type { Condition, ConditionGroup, Program } from "@/lib/types";

import { evaluateCondition, isGroup, type ProgramVerdict } from "./evaluate";
import type { FlatProfile } from "@/lib/types";

export interface Fit {
  score: number;
  reasons: string[]; // 점수를 만든 조건의 사람용 문구 (많이 기여한 순)
}

interface Weighted {
  weight: number;
  reason: string;
}

/** 조건 하나가 "대상을 얼마나 좁히는가". 0이면 위생 조건(대부분 통과) */
export function targetingWeight(c: Condition): Weighted {
  const values = Array.isArray(c.value) ? c.value.map(String) : [String(c.value)];
  switch (c.field) {
    case "region_code":
      if (c.op === "in" && !values.includes(REGION_ALL)) {
        return { weight: 3, reason: `${values.map((v) => REGION_LABEL[v] ?? v).join("·")} 소재 기업 한정` };
      }
      return { weight: 0, reason: "" };
    case "industry_code":
      // 제외 업종(not_in)은 위생 조건, 업종 한정(in/eq)은 표적 조건
      return c.op === "in" || c.op === "eq" ? { weight: 3, reason: `${c.label}` } : { weight: 0, reason: "" };
    case "ceo_age":
      return c.op === "lte" || c.op === "lt" ? { weight: 3, reason: c.label } : { weight: 1, reason: c.label };
    case "ceo_gender":
    case "certifications":
      return { weight: 3, reason: c.label };
    case "prior_support":
      // "졸업기업 한정"(includes)은 표적, "기수혜 제외"(not_in)는 위생
      return c.op === "includes" || c.op === "in" ? { weight: 3, reason: c.label } : { weight: 0, reason: "" };
    case "export_revenue_usd_prev_year":
      return { weight: 2, reason: c.label };
    case "hiring_planned":
    case "is_food_business":
    case "has_online_sales":
      return c.value === true || c.value === "true" ? { weight: 2, reason: c.label } : { weight: 0, reason: "" };
    case "business_age_months": {
      // 업력 창이 좁을수록(예: 3년 이내) 표적 — 7년(창업기업 정의 전체)은 위생
      if ((c.op === "lte" || c.op === "lt") && Number(c.value) <= 36) return { weight: 2, reason: c.label };
      if (c.op === "gte" || c.op === "gt") return { weight: 2, reason: c.label };
      return { weight: 0, reason: "" };
    }
    case "employee_count":
      return c.op === "gte" || c.op === "gt" ? { weight: 1, reason: c.label } : { weight: 0, reason: "" };
    case "annual_revenue_krw":
      return { weight: 1, reason: c.label };
    default:
      return { weight: 0, reason: "" };
  }
}

function leaves(node: Condition | ConditionGroup): Condition[] {
  return isGroup(node) ? node.conditions.flatMap(leaves) : [node];
}

/**
 * 통과한 조건의 표적 가중치 합. OR 그룹은 통과한 선택지 중 가장 큰 가중치 하나만 센다
 * (선택지가 많다고 점수가 부풀지 않게).
 */
export function computeFit(program: Program, verdict: ProgramVerdict, p: FlatProfile): Fit {
  if (verdict.overall !== "eligible") return { score: 0, reasons: [] };
  const root = program.eligibility ?? { operator: "AND", conditions: [] };
  const contributions: Weighted[] = [];

  for (const node of root.conditions) {
    const candidates = leaves(node)
      .filter((c) => evaluateCondition(c, p) === "pass")
      .map(targetingWeight)
      .filter((w) => w.weight > 0)
      .sort((a, b) => b.weight - a.weight);
    if (candidates.length === 0) continue;
    if (isGroup(node) && node.operator === "OR") contributions.push(candidates[0]);
    else contributions.push(...candidates);
  }

  contributions.sort((a, b) => b.weight - a.weight);
  return {
    score: contributions.reduce((a, w) => a + w.weight, 0),
    reasons: [...new Set(contributions.map((w) => w.reason))].slice(0, 3),
  };
}
