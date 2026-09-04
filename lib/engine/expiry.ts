// lib/engine/expiry.ts — 자격 소멸 예측 ("곧 사라짐") · PRD §6.2

import { EXPIRY_MAX_DAYS, FIELD_META } from "@/lib/constants";
import type { Condition, ConditionGroup, ExpiringItem, ExpiryAxis, FlatProfile, Program } from "@/lib/types";

import { evaluateGroup, isGroup, type ProgramVerdict } from "./evaluate";
import { addMonths, addYears, dDay, fmtDate, fmtMonths, fromIso } from "./format";

interface Candidate {
  axis: ExpiryAxis;
  flip: Date | null; // 자격이 처음 깨지는 날. 직원수 축은 날짜가 없다
  reason: string;
}

function leaves(node: Condition | ConditionGroup): Condition[] {
  if (!isGroup(node)) return [node];
  return node.conditions.flatMap(leaves);
}

/** 해당 필드만 소멸 직후 값으로 바꾼 프로필 */
function counterfactual(flat: FlatProfile, field: keyof FlatProfile, value: number): FlatProfile {
  return { ...flat, [field]: value };
}

/**
 * 상한 조건 리프 하나를 소멸 후보로 변환한다.
 * 반사실 평가(그 필드만 소멸 직후 값으로 바꿔 루트를 다시 평가)가 fail일 때만 항목이 된다.
 * 충족된 OR 그룹 안의 리프는 뒤집혀도 루트가 유지되므로 여기서 걸러진다(§6.2).
 */
function toCandidate(leaf: Condition, root: ConditionGroup, flat: FlatProfile): Candidate | null {
  if (leaf.op !== "lt" && leaf.op !== "lte") return null;
  const field = leaf.field;
  const meta = FIELD_META[field];
  if (!meta || (meta.mutability !== "time" && meta.mutability !== "mutable")) return null;

  const n = Number(leaf.value);
  if (!Number.isFinite(n)) return null;

  if (field === "business_age_months") {
    const founded = fromIso(flat.founded_at);
    if (!founded) return null;
    const breachValue = leaf.op === "lte" ? n + 1 : n; // 처음 위반하는 개월 수
    if (evaluateGroup(root, counterfactual(flat, field, breachValue)) !== "fail") return null;
    const flip = addMonths(founded, breachValue);
    return {
      axis: "업력",
      flip,
      reason: `업력 ${fmtMonths(n)} 이내 조건 — ${fmtDate(flip)} 이후 자격 소멸`,
    };
  }

  if (field === "ceo_age") {
    if (!flat.ceo_birth_date) return null; // 생년월일 없으면 항목을 만들지 않는다
    const birth = fromIso(flat.ceo_birth_date);
    if (!birth) return null;
    const breachValue = leaf.op === "lte" ? n + 1 : n;
    if (evaluateGroup(root, counterfactual(flat, field, breachValue)) !== "fail") return null;
    const flip = addYears(birth, breachValue);
    return {
      axis: "대표자연령",
      flip,
      reason: `대표자 만 ${n}세 이하 조건 — ${fmtDate(flip)} 이후 자격 소멸`,
    };
  }

  if (field === "employee_count") {
    const threshold = leaf.op === "lt" ? n : n + 1; // 자격이 깨지는 인원 수
    const gap = threshold - flat.employee_count;
    // 한 명 차이거나, 채용 예정이면서 두 명 차이일 때만 만든다 (그 외는 노이즈)
    const relevant = gap <= 1 || (flat.hiring_planned && gap <= 2);
    if (!relevant || gap < 1) return null;
    if (evaluateGroup(root, counterfactual(flat, field, threshold)) !== "fail") return null;
    return {
      axis: "직원수",
      flip: null,
      reason: `상시근로자 ${threshold}인 미만 조건 — 채용으로 ${threshold}인 도달 시 자격 소멸`,
    };
  }

  return null;
}

export function computeExpiry(
  program: Program,
  verdict: ProgramVerdict,
  flat: FlatProfile,
  today: Date,
): ExpiringItem | null {
  if (verdict.overall !== "eligible") return null;

  const root = program.eligibility ?? { operator: "AND", conditions: [] };
  const candidates = leaves(root)
    .map((leaf) => toCandidate(leaf, root, flat))
    .filter((c): c is Candidate => c !== null);
  if (candidates.length === 0) return null;

  // 포함 범위(365일)를 넘는 시간형은 후보에서 먼저 뺀다.
  // 그래야 §10.2 #14처럼 "업력 ≤84개월(먼 미래) + 직원 <5(임박)"인 프로그램이
  // 먼 업력 축에 가려 통째로 사라지지 않고 직원수 축으로 남는다.
  const timed = candidates
    .filter((c) => c.flip !== null && dDay(c.flip, today) <= EXPIRY_MAX_DAYS)
    .sort((a, b) => a.flip!.getTime() - b.flip!.getTime());

  // 프로그램당 1건: 시간형 중 가장 이른 flip 우선, 없으면 직원수형
  const chosen = timed[0] ?? candidates.find((c) => c.flip === null);
  if (!chosen) return null;

  const expiresIn = chosen.flip ? dDay(chosen.flip, today) : null;

  return {
    id: `exp:${program.id}`,
    grantName: program.title,
    expiresIn,
    reason: chosen.reason,
    axis: chosen.axis,
    programId: program.id,
    expiresOn: chosen.flip ? fmtDate(chosen.flip) : null,
    applyDeadline: program.apply_end,
  };
}

export function computeExpiringList(
  catalog: Program[],
  verdicts: ProgramVerdict[],
  flat: FlatProfile,
  today: Date,
): ExpiringItem[] {
  const byId = new Map(verdicts.map((v) => [v.programId, v]));
  const items: ExpiringItem[] = [];
  for (const program of catalog) {
    const verdict = byId.get(program.id);
    if (!verdict) continue;
    const item = computeExpiry(program, verdict, flat, today);
    if (item) items.push(item);
  }
  // expiresIn 오름차순, null(이벤트형)은 마지막
  return items.sort((a, b) => {
    if (a.expiresIn === null && b.expiresIn === null) return 0;
    if (a.expiresIn === null) return 1;
    if (b.expiresIn === null) return -1;
    return a.expiresIn - b.expiresIn;
  });
}
