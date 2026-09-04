// lib/data/supabaseRepository.ts — Supabase에서 카탈로그를 읽는다 (DATA_MODE=supabase)
// embedding·raw_text는 절대 내려보내지 않는다 (§5.5 — 1024 float가 응답에 실리면 페이로드가 폭증한다).
//
// "server-only" 마커는 Next 진입점인 repository.ts에 둔다. 이 파일은 scripts/*(tsx)도 함께 쓰는데,
// 스크립트는 번들러를 거치지 않아 마커가 있으면 실행이 막힌다. 브라우저 차단은 supabase.ts의 런타임 가드가 맡는다.

import type { DocumentType, Obligation, Program } from "@/lib/types";

import type { Catalog } from "./seedRepository";
import { getSupabase } from "./supabase";

// 클라이언트로 내려보낼 컬럼만 열거한다
const PROGRAM_COLUMNS = [
  "id", "source", "source_id", "title", "organization", "executing_org",
  "support_field", "support_type", "amount_text", "summary",
  "apply_start", "apply_end", "is_rolling", "original_url", "apply_url", "attachment_url",
  "eligibility", "unmapped_conditions", "required_documents",
  "review_status", "is_synthetic", "duplicate_of", "parsed_at", "created_at", "updated_at",
].join(",");

const OBLIGATION_COLUMNS = [
  "id", "category", "title", "what", "penalty", "authority",
  "legal_basis", "legal_text_excerpt", "legal_checked_at", "how_to_url",
  "applies_if", "schedule", "importance",
].join(",");

const DOCUMENT_COLUMNS = "id,name,issuer,lead_time_days,issue_url,verified_at";

export async function loadSupabaseCatalog(publicDemo: boolean): Promise<Catalog> {
  const db = getSupabase();
  if (!db) throw new Error("Supabase 클라이언트를 만들 수 없습니다.");

  // 목록에는 canonical만 (§5.5). 합성(시연용) 공고는 2026-09-04부터 노출하지 않는다 — 실수집 공고만.
  // publicDemo는 더 이상 합성 필터로 쓰지 않는다 (규정 해제 후 사용자 결정).
  void publicDemo;
  const programQuery = db.from("programs").select(PROGRAM_COLUMNS).is("duplicate_of", null).eq("is_synthetic", false);

  const [programs, obligations, documentTypes, dupes] = await Promise.all([
    programQuery,
    db.from("obligations").select(OBLIGATION_COLUMNS),
    db.from("document_types").select(DOCUMENT_COLUMNS),
    db.from("programs").select("duplicate_of").not("duplicate_of", "is", null),
  ]);

  for (const [name, res] of Object.entries({ programs, obligations, documentTypes, dupes })) {
    if (res.error) throw new Error(`Supabase ${name} 조회 실패: ${res.error.message}`);
  }

  const dualListedIds = [
    ...new Set((dupes.data ?? []).map((r) => (r as { duplicate_of: string }).duplicate_of)),
  ];

  return {
    programs: (programs.data ?? []) as unknown as Program[],
    obligations: (obligations.data ?? []) as unknown as Obligation[],
    documentTypes: (documentTypes.data ?? []) as unknown as DocumentType[],
    dualListedIds,
  };
}

/** 사이드바 푸터의 "공고 동기화" 시각 (§4.5-3) */
export async function loadLastSyncedAt(): Promise<string | null> {
  const db = getSupabase();
  if (!db) return null;
  const { data, error } = await db
    .from("ingest_runs")
    .select("finished_at")
    .not("finished_at", "is", null)
    .order("finished_at", { ascending: false })
    .limit(1);
  if (error) return null;
  return (data?.[0] as { finished_at: string } | undefined)?.finished_at ?? null;
}

/** 신청서 뼈대 생성용 원문. 서버 라우트에서만 호출한다 — 클라이언트로는 내려보내지 않는다 */
export async function loadProgramRawText(id: string): Promise<string | null> {
  const db = getSupabase();
  if (!db) return null;
  const { data, error } = await db.from("programs").select("raw_text").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return (data as { raw_text: string | null }).raw_text ?? null;
}
