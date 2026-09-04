// PRD §12.1 케이스 32~34 — simulate

import { describe, expect, it } from "vitest";

import { employeeThresholds, simulateEmployees } from "@/lib/engine/simulate";

import { TODAY, and, cond, obligation, profile, program } from "./helpers";

// §10.5 인원 임계값 참조표 기준의 최소 카탈로그
const OBLIGATIONS = [
  obligation({ id: "OBL-TAX-001", title: "원천세 신고·납부", applies_if: and(cond("employee_count", "gte", 1)) }),
  obligation({ id: "OBL-LABOR-005", title: "근로기준법 주요 조항 적용", applies_if: and(cond("employee_count", "gte", 5)) }),
  obligation({ id: "OBL-LABOR-006", title: "직장 내 괴롭힘 금지 규정 적용", applies_if: and(cond("employee_count", "gte", 5)) }),
  obligation({ id: "OBL-LABOR-007", title: "취업규칙 작성·신고", applies_if: and(cond("employee_count", "gte", 10)) }),
  obligation({ id: "OBL-LABOR-008", title: "노사협의회 설치", applies_if: and(cond("employee_count", "gte", 30)) }),
];

const PROGRAMS = [
  program({ id: "under5", title: "소상공인 자금", eligibility: and(cond("employee_count", "lt", 5)) }),
  program({ id: "under10", title: "초기창업패키지", eligibility: and(cond("employee_count", "lt", 10)) }),
  program({ id: "over5", title: "혁신창업스쿨", eligibility: and(cond("employee_count", "gte", 5)) }),
];

describe("simulate", () => {
  it("32. 4 → 5: LABOR-005·006 신규, 직원 5인 미만 프로그램 lost", () => {
    const diff = simulateEmployees(PROGRAMS, OBLIGATIONS, profile({ employee_count: 4 }), 5, TODAY);
    expect(diff.newObligations.map((o) => o.id)).toEqual(["OBL-LABOR-005", "OBL-LABOR-006"]);
    expect(diff.lostPrograms.map((p) => p.id)).toEqual(["under5"]);
    expect(diff.gainedPrograms.map((p) => p.id)).toEqual(["over5"]);
    expect(diff.crossedThresholds).toEqual([5]);
  });

  it("33. 4 → 10: 5인 + 10인 의무가 누적된다", () => {
    const diff = simulateEmployees(PROGRAMS, OBLIGATIONS, profile({ employee_count: 4 }), 10, TODAY);
    expect(diff.newObligations.map((o) => o.id)).toEqual(["OBL-LABOR-005", "OBL-LABOR-006", "OBL-LABOR-007"]);
    expect(diff.lostPrograms.map((p) => p.id)).toEqual(["under5", "under10"]);
    expect(diff.crossedThresholds).toEqual([5, 10]);
  });

  it("34. 5 → 4: removedObligations에 LABOR-005", () => {
    const diff = simulateEmployees(PROGRAMS, OBLIGATIONS, profile({ employee_count: 5 }), 4, TODAY);
    expect(diff.removedObligations.map((o) => o.id)).toEqual(["OBL-LABOR-005", "OBL-LABOR-006"]);
    expect(diff.gainedPrograms.map((p) => p.id)).toEqual(["under5"]);
    expect(diff.lostPrograms.map((p) => p.id)).toEqual(["over5"]);
  });

  it("employeeThresholds는 카탈로그의 employee_count 조건값을 정렬해 모은다", () => {
    expect(employeeThresholds(PROGRAMS, OBLIGATIONS)).toEqual([1, 5, 10, 30]);
  });

  it("변화가 없으면 모든 차집합이 비어 있다", () => {
    const diff = simulateEmployees(PROGRAMS, OBLIGATIONS, profile({ employee_count: 4 }), 4, TODAY);
    expect(diff.newObligations).toHaveLength(0);
    expect(diff.removedObligations).toHaveLength(0);
    expect(diff.lostPrograms).toHaveLength(0);
    expect(diff.gainedPrograms).toHaveLength(0);
    expect(diff.crossedThresholds).toEqual([]);
  });
});
