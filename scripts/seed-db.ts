// scripts/seed-db.ts — seed/*.json을 Supabase에 적재한다 (§11 Phase 3)
// 실행: npm run seed:db
//
// 멱등하다: (source, source_id)로 upsert하므로 몇 번 돌려도 결과가 같다.
// 시드의 상대 날짜는 "실행 시점"으로 확정되므로, 데모 당일 아침에 다시 실행한다 (§10.0).

import { config } from "dotenv";
config({ path: ".env.local" }); // tsx는 .env.local을 자동으로 읽지 않는다

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { resolveDate } from "../lib/engine/format";
import { requireSupabase } from "../lib/data/supabase";
import type { DocumentType, Obligation, Program } from "../lib/types";

const TODAY = new Date();

function readSeed<T>(name: string): T {
  return JSON.parse(readFileSync(resolve(process.cwd(), "seed", name), "utf8")) as T;
}

const resolveMaybe = (token: string | null) => (token === null ? null : resolveDate(token, TODAY));

async function main() {
  const db = requireSupabase();

  const programs = readSeed<Program[]>("programs.json");
  const obligations = readSeed<Obligation[]>("obligations.json");
  const documentTypes = readSeed<DocumentType[]>("document_types.json");
  const dedupePairs = readSeed<
    { program_a: string; program_b: string; similarity: number; period_overlap: boolean; decision: string; decided_by: string }[]
  >("dedupe_pairs.json");

  // ── 1. 서류·의무 (id가 텍스트라 그대로 upsert)
  const docRes = await db.from("document_types").upsert(documentTypes, { onConflict: "id" });
  if (docRes.error) throw new Error(`document_types: ${docRes.error.message}`);
  console.log(`  document_types  ${documentTypes.length}건`);

  // verify-law.ts가 남기는 law_mst·effective_date·legal_source_url·verified_by는
  // 시드 문서용 필드라 테이블(§5.5)에 없다. 스키마에 있는 컬럼만 보낸다.
  const OB_COLUMNS = [
    "id", "category", "title", "what", "penalty", "authority",
    "legal_basis", "legal_text_excerpt", "legal_checked_at", "how_to_url",
    "applies_if", "schedule", "importance",
  ] as const;
  const obligationRows = obligations.map((o) =>
    Object.fromEntries(OB_COLUMNS.map((k) => [k, (o as unknown as Record<string, unknown>)[k]])),
  );
  const obRes = await db.from("obligations").upsert(obligationRows, { onConflict: "id" });
  if (obRes.error) throw new Error(`obligations: ${obRes.error.message}`);
  console.log(`  obligations     ${obligations.length}건`);

  // ── 2. 프로그램 (id는 DB가 uuid로 만든다. duplicate_of는 uuid를 알아야 해서 2단계로)
  // 2026-09-04: 합성 공고는 Supabase에서 삭제했고 화면에도 내려보내지 않는다(실수집만).
  // 시드 프로그램은 --with-programs 를 명시했을 때만 다시 넣는다 (로컬 실험용).
  if (!process.argv.includes("--with-programs")) {
    console.log("  programs        건너뜀 (--with-programs 없음 · 실수집 공고만 운영)");
    return;
  }
  const rows = programs.map((p) => {
    // id(uuid)와 duplicate_of(uuid)는 DB가 정하거나 3단계에서 연결한다
    const row: Record<string, unknown> = { ...p };
    delete row.id;
    delete row.duplicate_of;
    row.apply_start = resolveMaybe(p.apply_start);
    row.apply_end = resolveMaybe(p.apply_end);
    row.created_at = resolveDate(p.created_at, TODAY);
    row.updated_at = resolveDate(p.updated_at, TODAY);
    return row;
  });

  const progRes = await db.from("programs").upsert(rows, { onConflict: "source,source_id" }).select("id,source_id");
  if (progRes.error) throw new Error(`programs: ${progRes.error.message}`);
  console.log(`  programs        ${rows.length}건`);

  // seed id("seed-01") → uuid 대응표. source_id("SEED-01")를 다리로 쓴다.
  const uuidBySourceId = new Map((progRes.data ?? []).map((r) => [r.source_id as string, r.id as string]));
  const uuidBySeedId = new Map(
    programs.map((p) => [p.id, uuidBySourceId.get(p.source_id ?? "")]).filter((e): e is [string, string] => !!e[1]),
  );

  // ── 3. 중복 관계 연결
  let linked = 0;
  for (const p of programs) {
    if (!p.duplicate_of) continue;
    const self = uuidBySeedId.get(p.id);
    const canonical = uuidBySeedId.get(p.duplicate_of);
    if (!self || !canonical) continue;
    const res = await db.from("programs").update({ duplicate_of: canonical }).eq("id", self);
    if (res.error) throw new Error(`duplicate_of(${p.id}): ${res.error.message}`);
    linked += 1;
  }
  console.log(`  duplicate_of    ${linked}건 연결`);

  // ── 4. 중복 판정 기록
  // note는 시드 문서용 필드라 테이블(§5.5)에 없다 — 컬럼을 명시해 걸러낸다
  const pairs = dedupePairs
    .map((d) => ({
      program_a: uuidBySeedId.get(d.program_a),
      program_b: uuidBySeedId.get(d.program_b),
      similarity: d.similarity,
      period_overlap: d.period_overlap,
      decision: d.decision,
      decided_by: d.decided_by,
    }))
    .filter((d): d is typeof d & { program_a: string; program_b: string } => !!d.program_a && !!d.program_b);
  if (pairs.length > 0) {
    const pairRes = await db.from("dedupe_pairs").upsert(pairs, { onConflict: "program_a,program_b" });
    if (pairRes.error) throw new Error(`dedupe_pairs: ${pairRes.error.message}`);
  }
  console.log(`  dedupe_pairs    ${pairs.length}건`);

  // ── 5. 임베딩이 이미 만들어져 있으면 함께 적재 (Phase 4 산출물, 없으면 건너뜀)
  try {
    const embeddings = readSeed<Record<string, number[]>>("embeddings.json");
    let embedded = 0;
    for (const [seedId, vector] of Object.entries(embeddings)) {
      const uuid = uuidBySeedId.get(seedId);
      if (!uuid) continue;
      const res = await db.from("programs").update({ embedding: vector }).eq("id", uuid);
      if (!res.error) embedded += 1;
    }
    console.log(`  embeddings      ${embedded}건`);
  } catch {
    console.log("  embeddings      없음 (Phase 4에서 npm run seed:embed 후 다시 실행)");
  }

  console.log("\n완료. DATA_MODE=supabase로 앱을 띄우면 이 데이터를 씁니다.");
}

main().catch((e) => {
  console.error("\n실패:", e instanceof Error ? e.message : e);
  process.exit(1);
});
