// lib/data/seedRepository.ts — seed/*.json을 카탈로그로 읽는다 (DATA_MODE=seed)
// 시드의 날짜는 상대 토큰(§10.0)이라 "요청 시점의 today" 기준으로 매번 해석한다.
// 그래서 대회 당일이 언제든 시나리오(마감 D-7, 소멸 D-55 …)가 유지된다.

import documentTypesJson from "@/seed/document_types.json";
import obligationsJson from "@/seed/obligations.json";
import profilesJson from "@/seed/profiles.json";
import programsJson from "@/seed/programs.json";

import { resolveDate } from "@/lib/engine/format";
import type { CompanyProfile, DocumentType, Obligation, Program } from "@/lib/types";

export interface Catalog {
  programs: Program[]; // canonical만 (duplicate_of === null)
  obligations: Obligation[];
  documentTypes: DocumentType[];
  dualListedIds: string[]; // 중복이 병합된 canonical id — "기업마당·K-Startup 동시 게시" 뱃지
}

/** 데모 프로필은 화면에 라벨을 보여줘야 해서 CompanyProfile에 한 필드를 덧붙인다 */
export interface DemoProfile extends CompanyProfile {
  demo_label: string;
}

const RAW_PROGRAMS = programsJson as unknown as Program[];
const RAW_OBLIGATIONS = obligationsJson as unknown as Obligation[];
const RAW_DOCUMENT_TYPES = documentTypesJson as unknown as DocumentType[];
const RAW_PROFILES = profilesJson as unknown as DemoProfile[];

function resolveMaybe(token: string | null, today: Date): string | null {
  return token === null ? null : resolveDate(token, today);
}

function resolveProgram(p: Program, today: Date): Program {
  return {
    ...p,
    apply_start: resolveMaybe(p.apply_start, today),
    apply_end: resolveMaybe(p.apply_end, today),
    created_at: resolveDate(p.created_at, today),
    updated_at: resolveDate(p.updated_at, today),
  };
}

/** 시드 카탈로그. 목록에는 canonical만 싣고, 중복으로 병합된 쪽은 뱃지 정보로만 남긴다 */
export function loadSeedCatalog(today: Date): Catalog {
  const all = RAW_PROGRAMS.map((p) => resolveProgram(p, today));
  const canonical = all.filter((p) => p.duplicate_of === null);
  const dualListedIds = [...new Set(all.filter((p) => p.duplicate_of).map((p) => p.duplicate_of as string))];

  return {
    programs: canonical,
    obligations: RAW_OBLIGATIONS,
    documentTypes: RAW_DOCUMENT_TYPES,
    dualListedIds,
  };
}

/** 중복제거 데모(S11)에서 필요한 원본 — canonical과 중복을 모두 포함한다 */
export function loadSeedProgramsIncludingDuplicates(today: Date): Program[] {
  return RAW_PROGRAMS.map((p) => resolveProgram(p, today));
}

/** 데모 프로필 3종 (§10.1). created_at은 불러오는 시점으로 다시 찍는다 */
export function loadSeedProfiles(today: Date): DemoProfile[] {
  const now = new Date().toISOString();
  return RAW_PROFILES.map((p) => ({
    ...p,
    founded_at: resolveDate(p.founded_at, today),
    ceo_birth_date: resolveMaybe(p.ceo_birth_date, today),
    created_at: now,
    updated_at: now,
  }));
}
