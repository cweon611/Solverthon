// lib/engine/dedupe.ts — 중복 판정의 결정론 부분 · PRD §6.6
// 임베딩(의미 비교)은 Voyage가 하지만, 최종 병합 결정은 여기의 임계값 + 기간 겹침이 한다(§3.1).

import { DEDUPE } from "@/lib/constants";
import type { Program, ProgramRow } from "@/lib/types";

export type DedupeDecision = "duplicate" | "review" | "distinct";

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error(`임베딩 차원이 다릅니다: ${a.length} vs ${b.length}`);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

type Period = Pick<Program, "apply_start" | "apply_end" | "is_rolling">;

/** 접수기간이 겹치는가. 상시이거나 날짜가 비면 보수적으로 true */
export function periodsOverlap(a: Period, b: Period): boolean {
  if (a.is_rolling || b.is_rolling) return true;
  if (!a.apply_start || !a.apply_end || !b.apply_start || !b.apply_end) return true;
  return a.apply_start <= b.apply_end && b.apply_start <= a.apply_end;
}

export function decideDuplicate(similarity: number, overlap: boolean): DedupeDecision {
  if (similarity >= DEDUPE.duplicate && overlap) return "duplicate";
  if (similarity >= DEDUPE.review) return "review";
  return "distinct";
}

/** 저장 시와 질의 시가 같은 템플릿을 써야 한다 (§7.2) */
export function buildEmbeddingText(
  p: Pick<ProgramRow, "title" | "organization" | "amount_text" | "summary" | "raw_text">,
): string {
  const body = p.summary ?? (p.raw_text ?? "").slice(0, 1500);
  return `${p.title}\n기관: ${p.organization}\n지원: ${p.amount_text ?? ""}\n${body}`;
}
