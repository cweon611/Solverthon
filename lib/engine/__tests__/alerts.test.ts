// PRD §6.7 — 대시보드 배너 1건 선택

import { describe, expect, it } from "vitest";

import { pickTopAlert } from "@/lib/engine/alerts";
import type { ProgramVerdict } from "@/lib/engine/evaluate";
import { addDays, toIso } from "@/lib/engine/format";
import type { ExpiringItem, Task } from "@/lib/types";

import { TODAY, program } from "./helpers";

const task = (o: Partial<Task>): Task => ({
  id: "OBL-TAX-001:2026-09-10",
  title: "원천세 신고·납부",
  type: "date",
  dueDate: "2026.09.10",
  dueDateIso: "2026-09-10",
  authority: "국세청",
  penalty: "미신고 시 가산세 20%",
  done: false,
  ...o,
});

const expiring = (o: Partial<ExpiringItem>): ExpiringItem => ({
  id: "exp:P1",
  grantName: "초기창업패키지",
  expiresIn: 56,
  reason: "업력 조건",
  axis: "업력",
  programId: "P1",
  expiresOn: "2026.10.28",
  applyDeadline: "2026-09-15",
  ...o,
});

const closingProgram = program({
  id: "P6",
  title: "중소기업 기술개발 R&D(창업성장)",
  organization: "중소기업기술정보진흥원",
  amount_text: "최대 2억원",
  is_rolling: false,
  apply_end: toIso(addDays(TODAY, 7)),
});
const passVerdict: ProgramVerdict[] = [{ programId: "P6", overall: "eligible", criteria: [], nearMiss: null }];

const base = { tasks: [], expiring: [], programs: [], verdicts: [], today: TODAY };

describe("alerts — pickTopAlert", () => {
  it("후보가 없으면 null (배너를 렌더하지 않는다)", () => {
    expect(pickTopAlert(base)).toBeNull();
  });

  it("기한 지난 의무가 가장 먼저", () => {
    const alert = pickTopAlert({
      ...base,
      tasks: [task({ dueDateIso: "2026-09-01", dueDate: "2026.09.01" })],
      expiring: [expiring({ expiresIn: 3 })],
    });
    expect(alert?.kind).toBe("overdue");
    expect(alert?.title).toBe("원천세 신고·납부 기한이 2일 지났습니다");
    expect(alert?.subtitle).toBe("국세청 · 미신고 시 가산세 20%");
    expect(alert?.href).toBe("/tasks");
  });

  it("3일 내 의무가 자격 소멸·공고 마감보다 먼저", () => {
    const alert = pickTopAlert({
      ...base,
      tasks: [task({ dueDateIso: "2026-09-05", dueDate: "2026.09.05" })],
      expiring: [expiring({ expiresIn: 10 })],
      programs: [closingProgram],
      verdicts: passVerdict,
    });
    expect(alert?.kind).toBe("due_soon");
    expect(alert?.title).toBe("원천세 신고·납부 마감 D-2");
  });

  it("소멸 D-56(66)보다 마감 D-7(27)이 먼저 — 시드 프로필 ①의 첫 배너", () => {
    const alert = pickTopAlert({
      ...base,
      expiring: [expiring({ expiresIn: 56 })],
      programs: [closingProgram],
      verdicts: passVerdict,
    });
    expect(alert?.kind).toBe("closing");
    expect(alert?.title).toBe("중소기업 기술개발 R&D(창업성장) 접수 마감 D-7");
    expect(alert?.subtitle).toBe("중소기업기술정보진흥원 · 최대 2억원");
    expect(alert?.href).toBe("/grants");
  });

  it("자격 소멸 배너의 부제는 축과 신청 마감일을 보여준다", () => {
    const alert = pickTopAlert({ ...base, expiring: [expiring({ expiresIn: 56 })] });
    expect(alert?.kind).toBe("expiring");
    expect(alert?.title).toBe("초기창업패키지 자격이 56일 후 소멸됩니다");
    expect(alert?.subtitle).toBe("업력 조건 만료 전 신청 마감일 2026.09.15");
  });

  it("알림 항목 토글이 꺼진 유형은 후보에서 빠진다", () => {
    const input = {
      ...base,
      tasks: [task({ dueDateIso: "2026-09-01", dueDate: "2026.09.01" })],
      expiring: [expiring({ expiresIn: 56 })],
    };
    const alert = pickTopAlert({ ...input, settings: { expiring: true, deadline: true, task: false } });
    expect(alert?.kind).toBe("expiring");
    expect(pickTopAlert({ ...input, settings: { expiring: false, deadline: false, task: false } })).toBeNull();
  });

  it("완료한 할 일과 90일을 넘는 소멸은 후보가 아니다", () => {
    const alert = pickTopAlert({
      ...base,
      tasks: [task({ done: true, dueDateIso: "2026-09-01" })],
      expiring: [expiring({ expiresIn: 120 }), expiring({ id: "exp:P2", expiresIn: null })],
    });
    expect(alert).toBeNull();
  });
});
