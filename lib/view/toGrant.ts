// lib/view/toGrant.ts — 엔진 판정 결과 → 판정함 뷰모델 (§5.4 매핑 규칙)

import type { ProgramVerdict } from "@/lib/engine/evaluate";
import { fmtDate, fromIso } from "@/lib/engine/format";
import { resolveApplyUrl, resolveOriginalUrl } from "@/lib/sourceLinks";
import type { EligibilityCriteria, Grant, Program } from "@/lib/types";

const CHECK_REASON_LEN = 60;

function deadlineText(program: Program): string {
  if (program.is_rolling || !program.apply_end) return "상시";
  const d = fromIso(program.apply_end);
  return d ? fmtDate(d) : "상시";
}

function toCriteria(verdict: ProgramVerdict): EligibilityCriteria[] {
  return verdict.criteria.map((c) => ({
    label: c.label,
    required: c.required,
    current: c.current,
    pass: c.state === "pass",
    state: c.state,
    sourceText: c.sourceText,
  }));
}

export function toGrant(program: Program, verdict: ProgramVerdict, closed = false): Grant {
  const criteria = toCriteria(verdict);
  const base: Grant = {
    id: program.id,
    name: program.title,
    agency: program.organization,
    amount: program.amount_text ?? "지원 규모 미기재",
    deadline: deadlineText(program),
    status: "pass",
    eligibility: criteria,
    supportType: program.support_type ?? undefined,
    description: program.summary ?? undefined,
    originalUrl: resolveOriginalUrl(program, closed) ?? undefined,
    applyUrl: resolveApplyUrl(program, closed) ?? undefined,
    attachmentUrl: program.attachment_url ?? undefined,
    reviewStatus: program.review_status,
    hasDocuments: (program.required_documents ?? []).length > 0,
    isSynthetic: program.is_synthetic,
  };

  if (verdict.overall === "eligible") return base;

  if (verdict.overall === "needs_check") {
    // 확인이 필요한 행만 모아 한 문장으로 만든다 — S3는 이 문자열 하나만 렌더한다
    const checkReasons = verdict.criteria
      .filter((c) => c.state === "check")
      .map((c) => `${c.label}: ${c.sourceText.slice(0, CHECK_REASON_LEN)}`);
    return {
      ...base,
      status: "conditional",
      subStatus: "needs_check",
      checkReasons,
      nearMissReason: checkReasons.join(" · "),
    };
  }

  // ineligible — 하나만 부족하고 해소 가능하면 조건부, 그 외는 제외
  if (verdict.nearMiss) {
    return { ...base, status: "conditional", subStatus: "near_miss", nearMissReason: verdict.nearMiss.message };
  }

  const firstFail = verdict.criteria.find((c) => c.state === "fail");
  return {
    ...base,
    status: "fail",
    failReason: firstFail
      ? `${firstFail.label} 조건 미충족 (${firstFail.required} — 현재 ${firstFail.current})`
      : "자격 요건 미충족",
  };
}
