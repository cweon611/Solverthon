// lib/ai/postprocess.ts — 파서 출력 → Program 필드 (§7.1 후처리)
// 파서는 모든 value를 문자열로 주므로 여기서 타입을 맞추고, 매핑 실패는 전부 unmapped로 보낸다.
// 판정은 하지 않는다. 여기서 만든 조건은 lib/engine이 평가한다.

import { BOOLEAN_FIELDS, DOC_ALIASES, NUMERIC_FIELDS, isConditionField } from "@/lib/constants";
import type {
  Condition,
  ConditionGroup,
  DocumentType,
  ProgramDocument,
  UnmappedCondition,
} from "@/lib/types";

import type { ParsedAnnouncement, ParsedCondition } from "./schema";

/** confidence가 이보다 낮으면 자동으로 확인 필요로 만든다 (§7.1-6) */
export const LOW_CONFIDENCE = 0.5;
const SUMMARY_MAX = 200;

export interface PostprocessResult {
  eligibility: ConditionGroup;
  unmapped_conditions: UnmappedCondition[];
  required_documents: ProgramDocument[];
  summary: string;
}

/**
 * 서류명 정규화: 수량 표현("1부", "각 2통", "사본")을 떼고 공백·괄호·중점을 지운다.
 * 공고문은 "사업계획서 1부"처럼 부수를 붙여 쓰는 일이 많아 그대로 두면 카탈로그와 어긋난다.
 */
export function normalizeDocName(name: string): string {
  return name
    .replace(/각?\s*\d+\s*[부통매점]\s*$/g, "")
    .replace(/\s*사본\s*$/g, "")
    .replace(/[\s()（）[\]·・]/g, "")
    .toLowerCase();
}

const ALIAS_BY_NORMALIZED = new Map(
  Object.entries(DOC_ALIASES).map(([from, to]) => [normalizeDocName(from), normalizeDocName(to)]),
);

/** 카탈로그에서 같은 서류를 찾는다. 못 찾으면 null → 리드타임 unknown */
export function matchDocumentType(name: string, docTypes: DocumentType[]): string | null {
  const normalized = normalizeDocName(name);
  const canonical = ALIAS_BY_NORMALIZED.get(normalized) ?? normalized;
  const hit = docTypes.find((d) => {
    const dn = normalizeDocName(d.name);
    return dn === canonical || dn === normalized;
  });
  return hit?.id ?? null;
}

/** 문자열 value를 필드 타입으로 바꾼다. 실패하면 null (→ unmapped) */
export function coerceValue(c: ParsedCondition): Condition["value"] | null {
  const field = c.field;
  const raw = c.value.trim();

  if (c.op === "in" || c.op === "not_in") {
    const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
    return list.length > 0 ? list : null;
  }

  if (NUMERIC_FIELDS.includes(field)) {
    const n = Number(raw.replace(/[,_\s]/g, ""));
    return Number.isFinite(n) ? n : null;
  }

  if (BOOLEAN_FIELDS.includes(field)) {
    if (/^(true|참|예|y|yes)$/i.test(raw)) return true;
    if (/^(false|거짓|아니오|n|no)$/i.test(raw)) return false;
    return null;
  }

  return raw.length > 0 ? raw : null;
}

/** 파서 조건 1개 → Condition. 매핑·변환 실패 시 사유를 담아 반환 */
function toCondition(c: ParsedCondition): { ok: true; condition: Condition } | { ok: false; reason: string } {
  if (!isConditionField(c.field)) {
    return { ok: false, reason: `알 수 없는 프로필 항목: ${c.field}` };
  }
  const value = coerceValue(c);
  if (value === null) {
    return { ok: false, reason: `값을 해석할 수 없음: "${c.value}"` };
  }
  return {
    ok: true,
    condition: {
      field: c.field,
      op: c.op,
      value,
      label: c.label,
      source_text: c.source_text,
    },
  };
}

/**
 * 파서 출력을 Program 필드로 옮긴다.
 * alternatives의 원소 하나가 OR 그룹 하나가 된다. 조건이 1개뿐인 원소는 그룹으로 감싸지 않는다 (§7.1-3).
 */
export function postprocess(parsed: ParsedAnnouncement, docTypes: DocumentType[] = []): PostprocessResult {
  const unmapped: UnmappedCondition[] = [...(parsed.unmapped_conditions ?? [])];
  const rootConditions: (Condition | ConditionGroup)[] = [];

  for (const c of parsed.conditions ?? []) {
    const r = toCondition(c);
    if (r.ok) rootConditions.push(r.condition);
    else unmapped.push({ text: c.source_text || c.label, reason: r.reason });
  }

  for (const block of parsed.alternatives ?? []) {
    const inner: Condition[] = [];
    for (const c of block.conditions ?? []) {
      const r = toCondition(c);
      if (r.ok) inner.push(r.condition);
      else unmapped.push({ text: c.source_text || c.label, reason: r.reason });
    }
    if (inner.length === 0) continue;
    // 선택지가 하나뿐이면 OR 그룹이 아니라 그냥 조건이다
    if (inner.length === 1) rootConditions.push(inner[0]);
    else rootConditions.push({ operator: "OR", conditions: inner });
  }

  // 확신도가 낮으면 판정을 유보시킨다
  if (typeof parsed.confidence === "number" && parsed.confidence < LOW_CONFIDENCE) {
    unmapped.push({ text: "(파서 확신도 낮음)", reason: `confidence ${parsed.confidence}` });
  }

  const required_documents: ProgramDocument[] = (parsed.required_documents ?? []).map((d) => ({
    document_type_id: matchDocumentType(d.name, docTypes),
    name: d.name,
    source_text: d.source_text,
    is_required: d.is_required,
  }));

  return {
    eligibility: { operator: "AND", conditions: rootConditions },
    unmapped_conditions: unmapped,
    required_documents,
    summary: (parsed.summary ?? "").slice(0, SUMMARY_MAX),
  };
}
