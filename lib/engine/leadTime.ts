// lib/engine/leadTime.ts — 준비서류 리드타임 역산 · PRD §6.5
// 리드타임 값은 document_types(사람이 확인·입력)에서만 온다. AI가 추정한 값은 쓰지 않는다(§0.1-8).

import { LEADTIME_TIGHT_DAYS } from "@/lib/constants";
import type { DocumentType, Program } from "@/lib/types";

import { addDays, dDay, fromIso, toIso } from "./format";

export type LeadTimeStatus = "ok" | "tight" | "late" | "unknown";

export interface LeadTimeItem {
  name: string;
  issuer: string | null;
  leadTimeDays: number | null;
  latestStart: string | null; // ISO "YYYY-MM-DD"
  status: LeadTimeStatus;
  issueUrl: string | null;
}

export interface LeadTimePlan {
  deadline: string | null;
  isRolling: boolean;
  items: LeadTimeItem[];
  overall: LeadTimeStatus | "rolling";
}

const SEVERITY: Record<LeadTimeStatus, number> = { late: 3, tight: 2, unknown: 1, ok: 0 };

export function computeLeadTime(program: Program, docTypes: DocumentType[], today: Date): LeadTimePlan {
  const byId = new Map(docTypes.map((d) => [d.id, d]));
  const end = program.apply_end ? fromIso(program.apply_end) : null;
  const isRolling = program.is_rolling || end === null;

  const items: LeadTimeItem[] = (program.required_documents ?? []).map((doc) => {
    const catalog = doc.document_type_id ? byId.get(doc.document_type_id) : undefined;
    const leadTimeDays = catalog?.lead_time_days ?? null;

    // 카탈로그 매칭 실패 또는 소요기간 미확인 → unknown
    if (!catalog || leadTimeDays === null) {
      return {
        name: doc.name,
        issuer: catalog?.issuer ?? null,
        leadTimeDays: null,
        latestStart: null,
        status: "unknown",
        issueUrl: catalog?.issue_url ?? null,
      };
    }

    // 상시 접수는 마감이 없어 역산하지 않는다
    if (!end) {
      return {
        name: doc.name,
        issuer: catalog.issuer,
        leadTimeDays,
        latestStart: null,
        status: "ok",
        issueUrl: catalog.issue_url,
      };
    }

    const latestStart = addDays(end, -leadTimeDays);
    const slack = dDay(latestStart, today);
    const status: LeadTimeStatus = slack < 0 ? "late" : slack <= LEADTIME_TIGHT_DAYS ? "tight" : "ok";

    return {
      name: doc.name,
      issuer: catalog.issuer,
      leadTimeDays,
      latestStart: toIso(latestStart),
      status,
      issueUrl: catalog.issue_url,
    };
  });

  if (isRolling) {
    return { deadline: program.apply_end, isRolling: true, items, overall: "rolling" };
  }

  const overall = items.reduce<LeadTimeStatus>(
    (worst, item) => (SEVERITY[item.status] > SEVERITY[worst] ? item.status : worst),
    "ok",
  );

  return { deadline: program.apply_end, isRolling: false, items, overall };
}
