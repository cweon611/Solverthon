// lib/engine/simulate.ts — 직원 수 변화 시뮬레이션 · PRD §6.4

import type { CompanyProfile, Condition, ConditionGroup, Obligation, Program } from "@/lib/types";

import { evaluateObligation, evaluateProgram, isGroup, toFlatProfile } from "./evaluate";

export interface SimulationDiff {
  from: number;
  to: number;
  crossedThresholds: number[];
  newObligations: Obligation[];
  removedObligations: Obligation[];
  lostPrograms: Program[];
  gainedPrograms: Program[];
}

function leaves(node: Condition | ConditionGroup): Condition[] {
  if (!isGroup(node)) return [node];
  return node.conditions.flatMap(leaves);
}

/** 카탈로그에 등장하는 employee_count 조건값 집합 (정렬) */
export function employeeThresholds(programs: Program[], obligations: Obligation[]): number[] {
  const values = new Set<number>();
  const collect = (root: ConditionGroup) => {
    for (const leaf of leaves(root)) {
      if (leaf.field !== "employee_count") continue;
      const n = Number(leaf.value);
      if (Number.isFinite(n)) values.add(n);
    }
  };
  for (const p of programs) collect(p.eligibility ?? { operator: "AND", conditions: [] });
  for (const o of obligations) collect(o.applies_if ?? { operator: "AND", conditions: [] });
  return [...values].sort((a, b) => a - b);
}

/** 특정 인원 임계값에서 새로 생기는 의무 (employee_count gte N 조건을 가진 의무) */
export function obligationsAddedAt(obligations: Obligation[], threshold: number): Obligation[] {
  return obligations.filter((o) =>
    leaves(o.applies_if ?? { operator: "AND", conditions: [] }).some(
      (leaf) => leaf.field === "employee_count" && leaf.op === "gte" && Number(leaf.value) === threshold,
    ),
  );
}

/** 직원 수를 to로 바꿨을 때 의무·자격이 어떻게 달라지는지 차집합으로 계산한다 */
export function simulateEmployees(
  programs: Program[],
  obligations: Obligation[],
  profile: CompanyProfile,
  to: number,
  today: Date,
): SimulationDiff {
  const from = profile.employee_count;
  const flatFrom = toFlatProfile(profile, today);
  const flatTo = { ...flatFrom, employee_count: to };

  const appliesFrom = new Set(obligations.filter((o) => evaluateObligation(o, flatFrom) === "pass").map((o) => o.id));
  const appliesTo = new Set(obligations.filter((o) => evaluateObligation(o, flatTo) === "pass").map((o) => o.id));

  const eligibleFrom = new Set(
    programs.filter((p) => evaluateProgram(p, flatFrom, today).overall === "eligible").map((p) => p.id),
  );
  const eligibleTo = new Set(
    programs.filter((p) => evaluateProgram(p, flatTo, today).overall === "eligible").map((p) => p.id),
  );

  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const crossedThresholds = employeeThresholds(programs, obligations).filter((t) => t > lo && t <= hi);

  return {
    from,
    to,
    crossedThresholds,
    newObligations: obligations.filter((o) => appliesTo.has(o.id) && !appliesFrom.has(o.id)),
    removedObligations: obligations.filter((o) => appliesFrom.has(o.id) && !appliesTo.has(o.id)),
    lostPrograms: programs.filter((p) => eligibleFrom.has(p.id) && !eligibleTo.has(p.id)),
    gainedPrograms: programs.filter((p) => eligibleTo.has(p.id) && !eligibleFrom.has(p.id)),
  };
}
