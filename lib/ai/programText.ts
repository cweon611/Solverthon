// lib/ai/programText.ts — 공고 1건을 신청서 뼈대 생성용 텍스트로 만든다.
// 실수집 공고는 raw_text(원문)를 쓰고, 합성 공고는 구조화 필드로 원문 대용 텍스트를 만든다.

import type { Condition, ConditionGroup, Program } from "@/lib/types";

const MAX_CHARS = 12_000;

function leaves(node: Condition | ConditionGroup): Condition[] {
  return "operator" in node ? node.conditions.flatMap(leaves) : [node];
}

export function buildProgramText(program: Program, rawText: string | null): string {
  if (rawText && rawText.trim().length > 0) return rawText.slice(0, MAX_CHARS);

  const conds = leaves(program.eligibility ?? { operator: "AND", conditions: [] })
    .map((c) => `- ${c.label}${c.source_text ? ` (${c.source_text})` : ""}`)
    .join("\n");
  const unmapped = (program.unmapped_conditions ?? []).map((u) => `- ${u.text}`).join("\n");
  const docs = (program.required_documents ?? [])
    .map((d) => `- ${d.name}${d.is_required ? " (필수)" : " (선택)"}`)
    .join("\n");

  return [
    `[공고명] ${program.title}`,
    `[공고기관] ${program.organization}${program.executing_org ? ` / [수행기관] ${program.executing_org}` : ""}`,
    `[지원분야] ${program.support_field}${program.support_type ? ` · ${program.support_type}` : ""}`,
    `[지원규모] ${program.amount_text ?? "미기재"}`,
    `[접수기간] ${program.apply_start ?? "-"} ~ ${program.is_rolling ? "상시" : program.apply_end ?? "-"}`,
    `[사업개요] ${program.summary ?? ""}`,
    `[신청자격]\n${conds || "- 명시 없음"}`,
    unmapped ? `[기타 조건]\n${unmapped}` : "",
    `[제출서류]\n${docs || "- 명시 없음"}`,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, MAX_CHARS);
}
