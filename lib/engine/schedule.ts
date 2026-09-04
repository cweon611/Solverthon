// lib/engine/schedule.ts — 마감일·D-day·할 일 생성 · PRD §6.3

import { TASK_WINDOW } from "@/lib/constants";
import type { FlatProfile, Obligation, ScheduleRule, Task } from "@/lib/types";

import { evaluateObligation } from "./evaluate";
import { addDays, dDay, fmtDate, fromIso, lastDayOfMonth, startOfDay, toIso } from "./format";

export { dDay } from "./format";

/** localStorage "bridge:tasks:v1" + 프로필 생성일 — 생성된 할 일에 사용자의 조작을 덮어쓴다 */
export interface TaskState {
  doneIds: string[];
  hiddenIds: string[];
  overrides: Record<string, Partial<Task>>;
  custom: Task[];
  profileCreatedAt: string;
}

export const EMPTY_TASK_STATE: TaskState = {
  doneIds: [],
  hiddenIds: [],
  overrides: {},
  custom: [],
  profileCreatedAt: "",
};

/** 월 길이를 넘는 day는 말일로 클램프 (매월 31일 → 2월 28/29일) */
function dayInMonth(year: number, monthIndex: number, day: number): Date {
  return new Date(year, monthIndex, Math.min(day, lastDayOfMonth(year, monthIndex)));
}

/** ISO 날짜 또는 ISO 일시 문자열 → 로컬 자정 Date */
function parseIsoLoose(s: string): Date | null {
  const dateOnly = fromIso(s.slice(0, 10));
  if (dateOnly) return dateOnly;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : startOfDay(d);
}

/** 지정한 월들(1~12) 중 today 이후(당일 포함) 가장 가까운 발생일. 올해에 없으면 다음 해 첫 달 */
function nextInMonths(months: number[], day: number, today: Date): Date {
  const base = startOfDay(today);
  const sorted = [...months].sort((a, b) => a - b);
  for (const m of sorted) {
    const candidate = dayInMonth(base.getFullYear(), m - 1, day);
    if (candidate >= base) return candidate;
  }
  return dayInMonth(base.getFullYear() + 1, sorted[0] - 1, day);
}

/** 다음 마감일. event_relative는 날짜가 없고, 이미 지난 once는 null (§6.3) */
export function nextDueDate(rule: ScheduleRule, today: Date): Date | null {
  const base = startOfDay(today);
  switch (rule.type) {
    case "monthly": {
      const thisMonth = dayInMonth(base.getFullYear(), base.getMonth(), rule.day);
      if (thisMonth >= base) return thisMonth;
      return dayInMonth(base.getFullYear(), base.getMonth() + 1, rule.day);
    }
    case "quarterly":
    case "semiannual":
      return nextInMonths(rule.months, rule.day, base);
    case "annual":
      return nextInMonths([rule.month], rule.day, base);
    case "once": {
      const d = fromIso(rule.date);
      if (!d) return null;
      return d >= base ? d : null;
    }
    case "event_relative":
      return null;
  }
}

/** from~to(양끝 포함) 구간의 모든 발생일. 캘린더 월 표시·할 일 생성에 쓴다 */
export function occurrencesBetween(rule: ScheduleRule, from: Date, to: Date): Date[] {
  const start = startOfDay(from);
  const end = startOfDay(to);
  if (start > end) return [];

  const out: Date[] = [];
  const push = (d: Date) => {
    if (d >= start && d <= end) out.push(d);
  };

  switch (rule.type) {
    case "monthly": {
      const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      while (cursor <= end) {
        push(dayInMonth(cursor.getFullYear(), cursor.getMonth(), rule.day));
        cursor.setMonth(cursor.getMonth() + 1);
      }
      break;
    }
    case "quarterly":
    case "semiannual":
    case "annual": {
      const months = rule.type === "annual" ? [rule.month] : rule.months;
      for (let y = start.getFullYear(); y <= end.getFullYear(); y += 1) {
        for (const m of [...months].sort((a, b) => a - b)) {
          push(dayInMonth(y, m - 1, rule.day));
        }
      }
      break;
    }
    case "once": {
      const d = fromIso(rule.date);
      if (d) push(d);
      break;
    }
    case "event_relative":
      break;
  }

  return out.sort((a, b) => a.getTime() - b.getTime());
}

/** 토·일 → 다음 월요일 (P1). 공휴일 테이블은 P2 */
export function shiftToBusinessDay(d: Date): Date {
  const dow = d.getDay();
  if (dow === 6) return addDays(d, 2);
  if (dow === 0) return addDays(d, 1);
  return startOfDay(d);
}

function baseTask(ob: Obligation, id: string): Omit<Task, "type" | "dueDate" | "done"> {
  return {
    id,
    title: ob.title,
    authority: ob.authority,
    penalty: ob.penalty,
    obligationId: ob.id,
    legalCheckedAt: ob.legal_checked_at,
    howToUrl: ob.how_to_url,
    importance: ob.importance,
  };
}

/**
 * 프로필에 해당하는 의무만 할 일로 펼친다 (§6.3).
 * 날짜형은 [max(today−30일, 프로필 생성일), today+60일] 구간의 발생일마다 1건.
 * 온보딩 이전에 지난 기한은 만들지 않는다 — 새 프로필이 즉시 '기한 지남'으로 뒤덮이는 것을 막는다.
 */
export function generateTasks(
  obligations: Obligation[],
  flat: FlatProfile,
  today: Date,
  state: TaskState = EMPTY_TASK_STATE,
  window?: { from: Date; to: Date },
): Task[] {
  const base = startOfDay(today);
  const createdAt = state.profileCreatedAt ? parseIsoLoose(state.profileCreatedAt) : null;
  const past = addDays(base, -TASK_WINDOW.past);
  // 캘린더는 보고 있는 달을 통째로 봐야 하므로 구간을 직접 넘긴다 (§8 S6).
  // 그 경우 프로필 생성일 클램프를 적용하지 않는다.
  const windowStart = window ? startOfDay(window.from) : createdAt && createdAt > past ? createdAt : past;
  const windowEnd = window ? startOfDay(window.to) : addDays(base, TASK_WINDOW.future);

  const done = new Set(state.doneIds);
  const hidden = new Set(state.hiddenIds);
  const generated: Task[] = [];

  for (const ob of obligations) {
    // 'check'인 의무는 할 일에 넣지 않는다 (판정함 법정의무 탭에서만 "확인 필요"로 노출)
    if (evaluateObligation(ob, flat) !== "pass") continue;

    if (ob.schedule.type === "event_relative") {
      const id = `${ob.id}:event`;
      if (hidden.has(id)) continue;
      generated.push({
        ...baseTask(ob, id),
        type: "event",
        dueDate: ob.schedule.label,
        done: done.has(id),
        ...state.overrides[id],
      });
      continue;
    }

    for (const occurrence of occurrencesBetween(ob.schedule, windowStart, windowEnd)) {
      const iso = toIso(occurrence);
      const id = `${ob.id}:${iso}`;
      if (hidden.has(id)) continue;
      const isDone = done.has(id);
      const days = dDay(occurrence, base);
      generated.push({
        ...baseTask(ob, id),
        type: "date",
        dueDate: fmtDate(occurrence),
        dueDateIso: iso,
        done: isDone,
        overdue: days < 0 && !isDone,
        ...state.overrides[id],
      });
    }
  }

  // 날짜형 D-day 오름차순, 이벤트형은 뒤. 커스텀 항목은 그 뒤에 병합한다.
  generated.sort((a, b) => {
    if (a.type !== b.type) return a.type === "date" ? -1 : 1;
    if (a.type === "event") return 0;
    return (a.dueDateIso ?? "").localeCompare(b.dueDateIso ?? "");
  });

  return [...generated, ...state.custom];
}
