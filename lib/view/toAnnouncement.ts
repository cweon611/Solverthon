// lib/view/toAnnouncement.ts — 카탈로그 → 공고 목록 뷰모델 (§5.4)

import { CLOSING_DAYS } from "@/lib/constants";
import type { ProgramVerdict } from "@/lib/engine/evaluate";
import { dDay, fmtDate, fromIso } from "@/lib/engine/format";
import { resolveOriginalUrl } from "@/lib/sourceLinks";
import type { Announcement, AnnouncementField, AnnouncementStatus, GrantStatus, Program } from "@/lib/types";

/** SupportField 8종 중 UI 칩에 없는 내수·경영·기타는 "기타"로 묶는다 */
export function toAnnouncementField(field: Program["support_field"]): AnnouncementField {
  switch (field) {
    case "창업":
    case "R&D":
    case "수출":
    case "고용":
    case "금융":
      return field;
    default:
      return "기타";
  }
}

export function announcementStatus(program: Program, today: Date): AnnouncementStatus {
  if (program.is_rolling || !program.apply_end) return "open";
  const end = fromIso(program.apply_end);
  if (!end) return "open";
  const days = dDay(end, today);
  if (days < 0) return "closed";
  if (days <= CLOSING_DAYS) return "closing";
  return "open";
}

const verdictToStatus = (v: ProgramVerdict["overall"]): GrantStatus =>
  v === "eligible" ? "pass" : v === "needs_check" ? "conditional" : "fail";

function dateText(iso: string | null): string {
  const d = iso ? fromIso(iso) : null;
  return d ? fmtDate(d) : "상시";
}

export function toAnnouncement(
  program: Program,
  verdict: ProgramVerdict,
  today: Date,
  dualListed = false,
): Announcement {
  const status = announcementStatus(program, today);
  const v = verdictToStatus(verdict.overall);
  return {
    id: program.id,
    title: program.title,
    agency: program.organization,
    field: toAnnouncementField(program.support_field),
    amount: program.amount_text ?? "지원 규모 미기재",
    startDate: dateText(program.apply_start),
    endDate: program.is_rolling ? "상시" : dateText(program.apply_end),
    status,
    verdict: v,
    eligible: v === "pass",
    originalUrl: resolveOriginalUrl(program, status === "closed") ?? undefined,
    attachmentUrl: program.attachment_url ?? undefined,
    createdAt: program.created_at,
    sortEnd: program.is_rolling ? null : program.apply_end,
    dualListed: dualListed || undefined,
    isSynthetic: program.is_synthetic,
  };
}
