// lib/engine/alerts.ts — 대시보드 배너 1건 선택 · PRD §6.7
// 후보 중 우선순위 값이 가장 작은 1건만 표시한다. 후보가 없으면 배너를 렌더하지 않는다.

import { ALERT_DUE_SOON_DAYS, CLOSING_DAYS, EXPIRY_AMBER } from "@/lib/constants";
import type { ExpiringItem, Program, Task, TopAlert } from "@/lib/types";

import type { ProgramVerdict } from "./evaluate";
import { dDay, fromIso, isoToDot } from "./format";

/** 마이페이지 알림 항목 토글 — 꺼진 유형은 후보에서 제외한다 */
export interface AlertSettings {
  expiring: boolean;
  deadline: boolean;
  task: boolean;
}

export const DEFAULT_ALERT_SETTINGS: AlertSettings = { expiring: true, deadline: true, task: true };

export interface AlertInput {
  tasks: Task[];
  expiring: ExpiringItem[];
  programs: Program[];
  verdicts: ProgramVerdict[];
  today: Date;
  settings?: AlertSettings;
}

// 동률이면 자격 소멸을 먼저 (§6.7)
const KIND_RANK: Record<TopAlert["kind"], number> = { expiring: 0, overdue: 1, due_soon: 1, closing: 1 };

export function collectAlerts(input: AlertInput): TopAlert[] {
  const { tasks, expiring, programs, verdicts, today } = input;
  const settings = input.settings ?? DEFAULT_ALERT_SETTINGS;
  const out: TopAlert[] = [];

  if (settings.task) {
    for (const t of tasks) {
      if (t.done || t.type !== "date" || !t.dueDateIso) continue;
      const due = fromIso(t.dueDateIso);
      if (!due) continue;
      const days = dDay(due, today);

      if (days < 0) {
        out.push({
          kind: "overdue",
          priority: -1000 + days,
          title: `${t.title} 기한이 ${Math.abs(days)}일 지났습니다`,
          subtitle: `${t.authority} · ${t.penalty}`,
          href: "/tasks",
        });
      } else if (days <= ALERT_DUE_SOON_DAYS) {
        out.push({
          kind: "due_soon",
          priority: days,
          title: `${t.title} 마감 D-${days}`,
          subtitle: `${t.authority} · ${t.penalty}`,
          href: "/tasks",
        });
      }
    }
  }

  if (settings.expiring) {
    for (const e of expiring) {
      if (e.expiresIn === null || e.expiresIn > EXPIRY_AMBER) continue;
      const deadline = e.applyDeadline ? isoToDot(e.applyDeadline) : "상시";
      out.push({
        kind: "expiring",
        priority: e.expiresIn + 10,
        title: `${e.grantName} 자격이 ${e.expiresIn}일 후 소멸됩니다`,
        subtitle: `${e.axis} 조건 만료 전 신청 마감일 ${deadline}`,
        href: "/expiring",
      });
    }
  }

  if (settings.deadline) {
    const passIds = new Set(verdicts.filter((v) => v.overall === "eligible").map((v) => v.programId));
    for (const p of programs) {
      if (!passIds.has(p.id) || p.is_rolling || !p.apply_end) continue;
      const end = fromIso(p.apply_end);
      if (!end) continue;
      const days = dDay(end, today);
      if (days < 0 || days > CLOSING_DAYS) continue;
      out.push({
        kind: "closing",
        priority: days + 20,
        title: `${p.title} 접수 마감 D-${days}`,
        subtitle: `${p.organization} · ${p.amount_text ?? "지원 규모 미기재"}`,
        href: "/grants",
      });
    }
  }

  return out.sort((a, b) => a.priority - b.priority || KIND_RANK[a.kind] - KIND_RANK[b.kind]);
}

export function pickTopAlert(input: AlertInput): TopAlert | null {
  return collectAlerts(input)[0] ?? null;
}
