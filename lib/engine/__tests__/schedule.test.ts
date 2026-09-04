// PRD §12.1 케이스 24~31 — schedule

import { describe, expect, it } from "vitest";

import { toFlatProfile } from "@/lib/engine/evaluate";
import { toIso } from "@/lib/engine/format";
import { generateTasks, nextDueDate, occurrencesBetween, shiftToBusinessDay } from "@/lib/engine/schedule";
import type { Task } from "@/lib/types";

import { TODAY, and, cond, obligation, profile } from "./helpers";

const iso = (d: Date | null) => (d ? toIso(d) : null);
const flat = (o?: Parameters<typeof profile>[0]) => toFlatProfile(profile(o), TODAY);

describe("schedule — nextDueDate", () => {
  it("24. monthly 10 — 오늘 9/3이면 9/10, 9/11이면 10/10", () => {
    expect(iso(nextDueDate({ type: "monthly", day: 10 }, new Date(2026, 8, 3)))).toBe("2026-09-10");
    expect(iso(nextDueDate({ type: "monthly", day: 10 }, new Date(2026, 8, 10)))).toBe("2026-09-10"); // 당일 포함
    expect(iso(nextDueDate({ type: "monthly", day: 10 }, new Date(2026, 8, 11)))).toBe("2026-10-10");
  });

  it("25. monthly 31 — 2월은 말일로 클램프", () => {
    expect(iso(nextDueDate({ type: "monthly", day: 31 }, new Date(2026, 1, 1)))).toBe("2026-02-28");
    expect(iso(nextDueDate({ type: "monthly", day: 31 }, new Date(2028, 1, 1)))).toBe("2028-02-29"); // 윤년
  });

  it("26. quarterly [1,4,7,10] 25 — 오늘 9/3이면 10/25", () => {
    expect(iso(nextDueDate({ type: "quarterly", months: [1, 4, 7, 10], day: 25 }, TODAY))).toBe("2026-10-25");
  });

  it("26b. semiannual [1,7] 25 — 오늘 9/3이면 다음 해 1/25", () => {
    expect(iso(nextDueDate({ type: "semiannual", months: [1, 7], day: 25 }, TODAY))).toBe("2027-01-25");
  });

  it("27. annual 5/31 — 오늘 9/3이면 다음 해 5/31", () => {
    expect(iso(nextDueDate({ type: "annual", month: 5, day: 31 }, TODAY))).toBe("2027-05-31");
  });

  it("28. event_relative → null", () => {
    expect(nextDueDate({ type: "event_relative", event: "hire", offset_days: 0, label: "채용 즉시" }, TODAY)).toBeNull();
  });

  it("once는 지나면 null", () => {
    expect(iso(nextDueDate({ type: "once", date: "2026-12-01" }, TODAY))).toBe("2026-12-01");
    expect(nextDueDate({ type: "once", date: "2026-01-01" }, TODAY)).toBeNull();
  });

  it("29. occurrencesBetween(monthly 10, 9/1~10/31) → [9/10, 10/10]", () => {
    const got = occurrencesBetween({ type: "monthly", day: 10 }, new Date(2026, 8, 1), new Date(2026, 9, 31));
    expect(got.map(toIso)).toEqual(["2026-09-10", "2026-10-10"]);
  });

  it("29b. occurrencesBetween는 해를 넘겨도 동작한다", () => {
    const got = occurrencesBetween({ type: "annual", month: 5, day: 31 }, new Date(2026, 0, 1), new Date(2027, 11, 31));
    expect(got.map(toIso)).toEqual(["2026-05-31", "2027-05-31"]);
  });

  it("30. shiftToBusinessDay — 토·일은 다음 월요일", () => {
    expect(iso(shiftToBusinessDay(new Date(2026, 8, 5)))).toBe("2026-09-07"); // 토 → 월
    expect(iso(shiftToBusinessDay(new Date(2026, 8, 6)))).toBe("2026-09-07"); // 일 → 월
    expect(iso(shiftToBusinessDay(new Date(2026, 8, 4)))).toBe("2026-09-04"); // 금 그대로
  });
});

describe("schedule — generateTasks", () => {
  const monthly = obligation({
    id: "OBL-TAX-001",
    title: "원천세 신고·납부",
    applies_if: and(cond("employee_count", "gte", 1)),
    schedule: { type: "monthly", day: 10 },
  });
  const event = obligation({
    id: "OBL-LABOR-001",
    title: "근로계약서 서면 교부",
    applies_if: and(cond("employee_count", "gte", 1)),
    schedule: { type: "event_relative", event: "hire", offset_days: 0, label: "채용 즉시" },
    importance: "high",
  });
  const state = (o: Partial<Parameters<typeof generateTasks>[3]> = {}) => ({
    doneIds: [],
    hiddenIds: [],
    overrides: {},
    custom: [] as Task[],
    profileCreatedAt: "",
    ...o,
  });

  it("31a. applies_if가 fail이면 생성하지 않는다", () => {
    const tasks = generateTasks([monthly], flat({ employee_count: 0 }), TODAY, state());
    expect(tasks).toHaveLength(0);
  });

  it("31b. 날짜형은 −30~+60일 구간의 발생일마다, 이벤트형은 1건", () => {
    const tasks = generateTasks([monthly, event], flat(), TODAY, state());
    const dates = tasks.filter((t) => t.type === "date").map((t) => t.dueDateIso);
    expect(dates).toEqual(["2026-08-10", "2026-09-10", "2026-10-10"]);
    const ev = tasks.find((t) => t.type === "event");
    expect(ev).toMatchObject({ id: "OBL-LABOR-001:event", dueDate: "채용 즉시" });
  });

  it("31c. 온보딩 이전에 지난 기한은 만들지 않는다", () => {
    const tasks = generateTasks([monthly], flat(), TODAY, state({ profileCreatedAt: "2026-09-01" }));
    expect(tasks.map((t) => t.dueDateIso)).toEqual(["2026-09-10", "2026-10-10"]);
  });

  it("31d. doneIds 반영 · overdue 플래그", () => {
    const tasks = generateTasks([monthly], flat(), TODAY, state({ doneIds: ["OBL-TAX-001:2026-09-10"] }));
    const past = tasks.find((t) => t.dueDateIso === "2026-08-10")!;
    const done = tasks.find((t) => t.dueDateIso === "2026-09-10")!;
    expect(past.overdue).toBe(true);
    expect(done.done).toBe(true);
    expect(done.overdue).toBe(false);
  });

  it("31e. hiddenIds 제외 · overrides 얕은 병합 · custom 뒤에 병합", () => {
    const custom: Task = {
      id: "custom:1",
      title: "내가 추가한 일",
      type: "date",
      dueDate: "2026.09.20",
      dueDateIso: "2026-09-20",
      authority: "",
      penalty: "",
      done: false,
    };
    const tasks = generateTasks(
      [monthly],
      flat(),
      TODAY,
      state({
        hiddenIds: ["OBL-TAX-001:2026-08-10"],
        overrides: { "OBL-TAX-001:2026-09-10": { title: "수정된 제목" } },
        custom: [custom],
      }),
    );
    expect(tasks.map((t) => t.id)).toEqual([
      "OBL-TAX-001:2026-09-10",
      "OBL-TAX-001:2026-10-10",
      "custom:1",
    ]);
    expect(tasks[0].title).toBe("수정된 제목");
    expect(tasks[0].authority).toBe("국세청"); // 얕은 병합이므로 나머지는 유지
  });

  it("31f. 날짜형이 이벤트형보다 앞에 정렬된다", () => {
    const tasks = generateTasks([event, monthly], flat(), TODAY, state());
    const types = tasks.map((t) => t.type);
    expect(types.indexOf("event")).toBe(types.length - 1);
  });
});
