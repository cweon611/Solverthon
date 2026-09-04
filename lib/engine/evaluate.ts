// lib/engine/evaluate.ts — 자격 판정 (3-state + near-miss) · PRD §6.1
// 순수 TS. react·next·@supabase를 import하지 않는다.
// LLM은 여기에 관여하지 않는다(§0.1-1): 판정은 전부 이 결정론적 코드가 한다.

import {
  BOOLEAN_FIELDS,
  CERT_LABEL,
  FIELD_META,
  INDUSTRY_LABEL,
  NEAR_MISS_TIME_MONTHS,
  REGION_ALL,
  REGION_LABEL,
  isConditionField,
} from "@/lib/constants";
import type {
  Certification,
  CompanyProfile,
  Condition,
  ConditionField,
  ConditionGroup,
  FlatProfile,
  Obligation,
  Program,
} from "@/lib/types";

import { addMonths, addYears, ageYears, dDay, fmtDate, fmtMonths, fmtYearMonth, fromIso, monthsBetween } from "./format";

export type State = "pass" | "fail" | "check";
export type Verdict = "eligible" | "ineligible" | "needs_check";

export interface CriterionResult {
  field: ConditionField | null; // null = unmapped · OR 그룹 행은 첫 리프의 field
  label: string; // FIELD_META[field].label ("업력") · unmapped면 원문 앞 30자
  required: string; // Condition.label ("3년 이상 7년 이하")
  current: string; // 포맷한 내 값 ("약 3년 2개월 (2023.06 창업)")
  state: State;
  sourceText: string;
}

export interface NearMiss {
  field: ConditionField;
  message: string;
}

export interface ProgramVerdict {
  programId: string;
  overall: Verdict;
  criteria: CriterionResult[];
  nearMiss: NearMiss | null;
}

// ─── 프로필 평탄화 ──────────────────────────────────────────────────────────

/** CompanyProfile → FlatProfile. 파생값(업력·만 나이)은 저장하지 않고 today 기준으로 계산한다(§5.1) */
export function toFlatProfile(p: CompanyProfile, today: Date): FlatProfile {
  const founded = fromIso(p.founded_at);
  return {
    business_type: p.business_type,
    industry_code: p.industry_code,
    region_code: p.region_code,
    founded_at: p.founded_at,
    ceo_birth_date: p.ceo_birth_date,
    business_age_months: founded ? monthsBetween(founded, today) : 0,
    employee_count: p.employee_count,
    ceo_age: p.ceo_birth_date ? ageYears(p.ceo_birth_date, today) : null,
    ceo_gender: p.ceo_gender,
    annual_revenue_krw: p.annual_revenue_krw,
    export_revenue_usd_prev_year: p.export_revenue_usd_prev_year,
    is_vat_exempt: p.is_vat_exempt,
    certifications: p.certifications,
    hiring_planned: p.flags.hiring_planned,
    has_online_sales: p.flags.has_online_sales,
    handles_personal_data: p.flags.handles_personal_data,
    is_food_business: p.flags.is_food_business,
  };
}

// ─── 조건 평가 ──────────────────────────────────────────────────────────────

export function isGroup(node: Condition | ConditionGroup): node is ConditionGroup {
  return typeof (node as ConditionGroup).operator === "string" && Array.isArray((node as ConditionGroup).conditions);
}

function toStringArray(value: Condition["value"]): string[] {
  if (Array.isArray(value)) return value.map(String);
  return [String(value)];
}

/** industry_code는 prefix 매칭: 조건 "C"는 "C26"에 매칭, "C10"은 "C26"에 매칭하지 않는다(§6.1) */
function industryMatches(conditionCode: string, profileCode: string): boolean {
  return profileCode.startsWith(conditionCode);
}

export function evaluateCondition(c: Condition, p: FlatProfile): State {
  // 파서 후처리에서 이미 unmapped로 갔어야 하는 값 — 방어적으로 check
  if (!isConditionField(c.field)) return "check";

  const value = p[c.field];
  const isBooleanField = BOOLEAN_FIELDS.includes(c.field);
  if (!isBooleanField && (value === null || value === undefined)) return "check";

  switch (c.op) {
    case "lt":
    case "lte":
    case "gt":
    case "gte": {
      if (typeof value !== "number") return "check";
      const threshold = Number(c.value);
      if (!Number.isFinite(threshold)) return "check";
      const ok =
        c.op === "lt" ? value < threshold
        : c.op === "lte" ? value <= threshold
        : c.op === "gt" ? value > threshold
        : value >= threshold;
      return ok ? "pass" : "fail";
    }

    case "eq":
    case "neq": {
      let same: boolean;
      if (c.field === "industry_code") {
        same = industryMatches(String(c.value), String(value));
      } else if (typeof value === "boolean") {
        same = value === (c.value === true || c.value === "true");
      } else {
        same = String(value) === String(c.value);
      }
      const ok = c.op === "eq" ? same : !same;
      return ok ? "pass" : "fail";
    }

    case "in":
    case "not_in": {
      const list = toStringArray(c.value);
      // region_code에 ["ALL"]이면 전국 대상 (§6.1)
      if (c.field === "region_code" && list.includes(REGION_ALL)) {
        return c.op === "in" ? "pass" : "fail";
      }
      let contained: boolean;
      if (c.field === "industry_code") {
        contained = list.some((code) => industryMatches(code, String(value)));
      } else if (Array.isArray(value)) {
        contained = value.some((v) => list.includes(String(v)));
      } else {
        contained = list.includes(String(value));
      }
      const ok = c.op === "in" ? contained : !contained;
      return ok ? "pass" : "fail";
    }

    case "includes": {
      if (!Array.isArray(value)) return "check";
      const needles = toStringArray(c.value);
      const owned = value.map(String);
      return needles.every((n) => owned.includes(n)) ? "pass" : "fail";
    }

    default:
      return "check";
  }
}

export function evaluateGroup(g: ConditionGroup, p: FlatProfile): State {
  const states = g.conditions.map((node) => (isGroup(node) ? evaluateGroup(node, p) : evaluateCondition(node, p)));
  if (g.operator === "AND") {
    if (states.includes("fail")) return "fail";
    if (states.includes("check")) return "check";
    return "pass";
  }
  // OR
  if (states.includes("pass")) return "pass";
  if (states.includes("check")) return "check";
  return "fail";
}

export function evaluateObligation(ob: Obligation, p: FlatProfile): State {
  return evaluateGroup(ob.applies_if, p);
}

// ─── 값 표시 포맷 ───────────────────────────────────────────────────────────

const GENDER_LABEL: Record<string, string> = { male: "남성", female: "여성" };

function formatFieldValue(field: ConditionField, p: FlatProfile): string {
  const v = p[field];
  if (BOOLEAN_FIELDS.includes(field)) return v ? "예" : "아니오";
  if (v === null || v === undefined) return "미입력";

  switch (field) {
    case "business_age_months": {
      const founded = fromIso(p.founded_at);
      const age = fmtMonths(Number(v));
      return founded ? `약 ${age} (${fmtYearMonth(founded)} 창업)` : `약 ${age}`;
    }
    case "employee_count":
      return `${v}인`;
    case "ceo_age":
      return `만 ${v}세`;
    case "ceo_gender":
      return GENDER_LABEL[String(v)] ?? "미입력";
    case "region_code":
      return REGION_LABEL[String(v)] ?? String(v);
    case "industry_code":
      return INDUSTRY_LABEL[String(v)] ?? String(v);
    case "business_type":
      return v === "corporation" ? "법인" : "개인사업자";
    case "annual_revenue_krw":
      return `${(Number(v) / 100_000_000).toLocaleString("ko-KR")}억원`;
    case "export_revenue_usd_prev_year":
      return `${Number(v).toLocaleString("ko-KR")}달러`;
    case "certifications": {
      const list = (v as Certification[]).map((c) => CERT_LABEL[c] ?? c);
      return list.length > 0 ? list.join(", ") : "미보유";
    }
    default:
      return String(v);
  }
}

// ─── 요건표 행 생성 ─────────────────────────────────────────────────────────

interface Row {
  result: CriterionResult;
  leaves: Condition[]; // near-miss 판정이 들여다볼 원본 리프
}

function flattenLeaves(node: Condition | ConditionGroup): Condition[] {
  if (!isGroup(node)) return [node];
  return node.conditions.flatMap(flattenLeaves);
}

function leafLabel(c: Condition): string {
  return isConditionField(c.field) ? FIELD_META[c.field].label : c.field;
}

function rowFromLeaf(c: Condition, p: FlatProfile): Row {
  const state = evaluateCondition(c, p);
  return {
    leaves: [c],
    result: {
      field: isConditionField(c.field) ? c.field : null,
      label: leafLabel(c),
      required: c.label,
      current: isConditionField(c.field) ? formatFieldValue(c.field, p) : "확인 필요",
      state,
      sourceText: c.source_text,
    },
  };
}

/** OR 그룹 → 행 1개로 합친다 (§6.1) */
function rowFromGroup(g: ConditionGroup, p: FlatProfile): Row {
  const leaves = flattenLeaves(g);
  const state = evaluateGroup(g, p);
  const first = leaves[0];
  const passing = leaves.find((l) => evaluateCondition(l, p) === "pass");
  const shown = passing ?? first;
  return {
    leaves,
    result: {
      field: shown && isConditionField(shown.field) ? shown.field : null,
      label: leaves.map(leafLabel).join(" 또는 "),
      required: leaves.map((l) => l.label).join(" 또는 "),
      current: shown && isConditionField(shown.field) ? formatFieldValue(shown.field, p) : "확인 필요",
      state,
      sourceText: first?.source_text ?? "",
    },
  };
}

function unmappedRow(text: string, reason: string): Row {
  return {
    leaves: [],
    result: {
      field: null,
      label: text.slice(0, 30),
      required: reason || "AI가 필드에 매핑하지 못한 조건",
      current: "확인 필요",
      state: "check",
      sourceText: text,
    },
  };
}

/** 실수집 공고인데 AI 파싱 전 — 구조화 조건(지역 등)만 있어도 자격을 단정하지 않는다 */
const UNPARSED_ROW: Row = {
  leaves: [],
  result: {
    field: null,
    label: "자격 요건",
    required: "AI 파싱 전 — 원문에서 확인",
    current: "확인 필요",
    state: "check",
    sourceText: "",
  },
};

const EMPTY_ROW: Row = {
  leaves: [],
  result: {
    field: null,
    label: "자격 요건",
    required: "자격 요건 정보 없음 — 원문 확인",
    current: "확인 필요",
    state: "check",
    sourceText: "",
  },
};

// ─── near-miss (조건부) ─────────────────────────────────────────────────────

interface NearMissCandidate {
  leaf: Condition;
  field: ConditionField;
  threshold: number;
  gapDays: number; // 충족까지 남은 일수. 즉시 실행 가능(채용·인증)은 0
  message: string;
}

/**
 * 실패한 리프가 near-miss인지 판정한다 (§6.1).
 * 하한(gte/gt)이거나 인증 취득(includes)일 때만 인정한다.
 * 상한 초과(lt/lte 실패)와 fixed 필드는 "바꾸면 된다"고 안내하지 않는다.
 */
function nearMissCandidate(leaf: Condition, p: FlatProfile, today: Date): NearMissCandidate | null {
  if (!isConditionField(leaf.field)) return null;
  if (evaluateCondition(leaf, p) !== "fail") return null;

  const field = leaf.field;
  const meta = FIELD_META[field];
  const isLowerBound = leaf.op === "gte" || leaf.op === "gt";

  // 인증 취득 (acquirable)
  if (field === "certifications" && leaf.op === "includes") {
    const wanted = toStringArray(leaf.value)[0] as Certification;
    return {
      leaf,
      field,
      threshold: 0,
      gapDays: 0,
      message: `${CERT_LABEL[wanted] ?? wanted} 보유 조건 — 미보유. 인증 취득 시 자격 충족`,
    };
  }

  if (!isLowerBound) return null;
  const n = Number(leaf.value);
  if (!Number.isFinite(n)) return null;
  const threshold = leaf.op === "gt" ? n + 1 : n;

  // 채용으로 해소 (mutable)
  if (field === "employee_count" && meta.mutability === "mutable") {
    const cur = p.employee_count;
    return {
      leaf,
      field,
      threshold,
      gapDays: 0,
      message: `상시근로자 ${threshold}인 이상 조건 — 현재 ${cur}인. ${threshold - cur}명 충원 시 자격 충족`,
    };
  }

  // 시간이 지나면 해소 (time) — 충족 시점이 12개월 이내일 때만
  if (meta.mutability !== "time") return null;

  let achieve: Date | null = null;
  let message = "";
  if (field === "business_age_months") {
    const founded = fromIso(p.founded_at);
    if (!founded) return null;
    achieve = addMonths(founded, threshold);
    message = `업력 ${fmtMonths(threshold)} 이상 조건 — 현재 ${fmtMonths(p.business_age_months)}. ${fmtDate(achieve)}부터 자격 발생`;
  } else if (field === "ceo_age") {
    if (!p.ceo_birth_date) return null;
    const birth = fromIso(p.ceo_birth_date);
    if (!birth || p.ceo_age === null) return null;
    achieve = addYears(birth, threshold);
    message = `대표자 만 ${threshold}세 이상 조건 — 현재 만 ${p.ceo_age}세. ${fmtDate(achieve)}부터 자격 발생`;
  }
  if (!achieve) return null;

  const gapDays = dDay(achieve, today);
  if (achieve > addMonths(today, NEAR_MISS_TIME_MONTHS)) return null;

  return { leaf, field, threshold, gapDays, message };
}

function computeNearMiss(rows: Row[], p: FlatProfile, today: Date): NearMiss | null {
  const failRows = rows.filter((r) => r.result.state === "fail");
  if (failRows.length !== 1) return null;

  const candidates = failRows[0].leaves
    .map((leaf) => nearMissCandidate(leaf, p, today))
    .filter((c): c is NearMissCandidate => c !== null);
  if (candidates.length === 0) return null;

  // 여러 개면 충족까지의 차이가 가장 작은 리프로 메시지를 만든다 (§6.1)
  candidates.sort((a, b) => a.gapDays - b.gapDays);
  const best = candidates[0];
  return { field: best.field, message: best.message };
}

// ─── 프로그램 종합 판정 ─────────────────────────────────────────────────────

export function evaluateProgram(program: Program, p: FlatProfile, today: Date): ProgramVerdict {
  const root = program.eligibility ?? { operator: "AND", conditions: [] };
  const unmapped = program.unmapped_conditions ?? [];
  const rootIsEmpty = root.conditions.length === 0;

  // 행 생성: 루트 AND의 리프는 행 1개씩, 루트 안의 OR 그룹은 행 1개로 합친다
  let rows: Row[];
  if (rootIsEmpty) {
    rows = [];
  } else if (root.operator === "OR") {
    rows = [rowFromGroup(root, p)];
  } else {
    rows = root.conditions.map((node) => (isGroup(node) ? rowFromGroup(node, p) : rowFromLeaf(node, p)));
  }

  // 리프를 세어 종합을 내지 않는다 — 그룹 평가 결과를 그대로 쓴다 (§6.1)
  let state: State = rootIsEmpty ? "pass" : evaluateGroup(root, p);

  if (rootIsEmpty && unmapped.length === 0) {
    rows = [EMPTY_ROW];
    state = "check";
  }

  if (unmapped.length > 0) {
    rows = [...rows, ...unmapped.map((u) => unmappedRow(u.text, u.reason))];
    // AND 루트에 check 조건을 하나 더 넣은 것과 같다 — fail이 우선한다
    state = state === "fail" ? "fail" : "check";
  }

  // 실수집 공고가 아직 한 번도 파싱되지 않았다면(요약도 없음), 지역 같은 구조화 조건만으로 "대상"이 되지 않게 한다.
  // 재파싱 대기 중(parsed_at은 비었지만 이전 파싱 결과가 남아 있음)인 공고는 이전 결과로 그대로 판정한다 —
  // 재수집 때마다 판정함이 통째로 "확인 필요"로 뒤집히지 않도록.
  if (!program.is_synthetic && !program.parsed_at && !program.summary) {
    rows = rows.filter((r) => r !== EMPTY_ROW);
    rows = [...rows, UNPARSED_ROW];
    state = state === "fail" ? "fail" : "check";
  }

  const overall: Verdict = state === "pass" ? "eligible" : state === "fail" ? "ineligible" : "needs_check";
  const nearMiss = overall === "ineligible" ? computeNearMiss(rows, p, today) : null;

  return { programId: program.id, overall, criteria: rows.map((r) => r.result), nearMiss };
}

/** 카탈로그 전체 판정 */
export function evaluateAll(programs: Program[], p: FlatProfile, today: Date): ProgramVerdict[] {
  return programs.map((program) => evaluateProgram(program, p, today));
}
