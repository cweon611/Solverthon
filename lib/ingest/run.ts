// lib/ingest/run.ts — 수집 파이프라인 1회 실행 (§7.5)
//
// 멱등: 같은 입력으로 몇 번 돌려도 결과가 같다. 파싱·임베딩은 미처리분만 진행하므로
// 백로그는 다음 런에서 이어진다. 각 단계가 끝날 때마다 카운터를 즉시 기록해
// 함수가 중간에 끊겨도 진행 상황이 남는다.

import { parseAnnouncement } from "@/lib/ai/claude";
import { postprocess } from "@/lib/ai/postprocess";
import { embed } from "@/lib/ai/voyage";
import { requireSupabase } from "@/lib/data/supabase";
import { buildEmbeddingText, cosineSimilarity, decideDuplicate, periodsOverlap } from "@/lib/engine/dedupe";
import { DEDUPE } from "@/lib/constants";
import type { Condition, ConditionGroup, DocumentType, Program } from "@/lib/types";

import { fetchAttachmentText } from "./attachment";
import { fetchBizinfo, isBizinfoEnabled } from "./bizinfo";
import { fetchKstartup, isKstartupEnabled } from "./kstartup";
import type { RawAnnouncement } from "./normalize";

export interface IngestOptions {
  sources?: ("kstartup" | "bizinfo")[];
  maxFetch?: number;
  maxParse?: number;
  maxEmbed?: number;
  region?: string;
  log?: (message: string) => void;
}

export interface IngestRun {
  id: number | null;
  source: string;
  fetched: number;
  upserted: number;
  parsed: number;
  embedded: number;
  deduped: number;
  failed: number;
  notes: string | null;
  startedAt: string;
  finishedAt: string | null;
}

const PARSE_CONCURRENCY = 3;

/** raw_text가 바뀌었는지 비교할 때 쓰는 짧은 해시. 공백·줄바꿈(\r\n 등) 차이는 내용 변경으로 보지 않는다 */
function hash(s: string): string {
  const n = s.replace(/\s+/g, " ").trim();
  let h = 0;
  for (let i = 0; i < n.length; i += 1) {
    h = (Math.imul(31, h) + n.charCodeAt(i)) | 0;
  }
  return String(h);
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = cursor;
      cursor += 1;
      if (i >= items.length) return;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function runIngest(options: IngestOptions = {}): Promise<IngestRun> {
  const sources = options.sources ?? ["kstartup", "bizinfo"];
  const maxFetch = options.maxFetch ?? 200;
  const maxParse = options.maxParse ?? 20;
  const maxEmbed = options.maxEmbed ?? 100;
  const log = options.log ?? (() => {});

  const db = requireSupabase();
  const startedAt = new Date().toISOString();
  const notes: string[] = [];

  const run: IngestRun = {
    id: null, source: sources.join(","), fetched: 0, upserted: 0, parsed: 0,
    embedded: 0, deduped: 0, failed: 0, notes: null, startedAt, finishedAt: null,
  };

  // 실행 기록을 먼저 만들고 단계마다 갱신한다
  const created = await db.from("ingest_runs").insert({ source: run.source, started_at: startedAt }).select("id").single();
  if (created.error) throw new Error(`ingest_runs 생성 실패: ${created.error.message}`);
  run.id = created.data.id as number;
  const update = async () => {
    await db.from("ingest_runs").update({
      fetched: run.fetched, upserted: run.upserted, parsed: run.parsed,
      embedded: run.embedded, deduped: run.deduped, failed: run.failed,
      notes: notes.join(" · ") || null, finished_at: run.finishedAt,
    }).eq("id", run.id!);
  };

  // ── 1. 수집 ────────────────────────────────────────────────────────────────
  const raw: RawAnnouncement[] = [];
  for (const source of sources) {
    try {
      if (source === "kstartup") {
        if (!isKstartupEnabled()) { notes.push("kstartup 키 없음 — 건너뜀"); log("  kstartup: 키 없음, 건너뜀"); continue; }
        const rows = await fetchKstartup({ maxFetch, region: options.region });
        raw.push(...rows);
        log(`  kstartup: ${rows.length}건 수집`);
      } else {
        if (!isBizinfoEnabled()) { notes.push("bizinfo 키 미발급 — 건너뜀"); log("  bizinfo: 키 미발급, 건너뜀"); continue; }
        const rows = await fetchBizinfo({ maxFetch, region: options.region });
        raw.push(...rows);
        log(`  bizinfo: ${rows.length}건 수집`);
      }
    } catch (e) {
      run.failed += 1;
      notes.push(`${source} 수집 실패: ${e instanceof Error ? e.message : e}`);
      log(`  ${source}: 수집 실패 — ${e instanceof Error ? e.message : e}`);
    }
  }
  run.fetched = raw.length;
  await update();

  // ── 2. upsert ──────────────────────────────────────────────────────────────
  if (raw.length > 0) {
    // 이미 파싱된 행은 raw_text가 그대로면 다시 파싱하지 않는다 (§7.3 저장 규칙)
    // 2026-09-03 사고: source_id 400개를 in()으로 한 번에 조회하다 실패했는데 error를 보지 않아 prev가 비었고,
    // 그 결과 444건의 parsed_at이 전부 지워져 판정함이 "AI 파싱 전"으로 뒤덮였다.
    // → 100개씩 나눠 조회하고, 하나라도 실패하면 이번 런에서는 parsed_at을 건드리지 않는다.
    const ids = raw.map((r) => r.source_id);
    const prev = new Map<string, { source: string; source_id: string; raw_text: string | null; parsed_at: string | null }>();
    let lookupFailed = false;
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = await db.from("programs").select("source,source_id,raw_text,parsed_at").in("source_id", ids.slice(i, i + 100));
      if (chunk.error) { lookupFailed = true; notes.push(`기존 행 조회 실패(${i}~): ${chunk.error.message.slice(0, 80)}`); break; }
      for (const r of chunk.data ?? []) prev.set(`${r.source}:${r.source_id}`, r as typeof prev extends Map<string, infer V> ? V : never);
    }
    if (lookupFailed) log("  기존 행 조회 실패 — 이번 런은 parsed_at을 유지한다 (재파싱 큐 변경 없음)");

    let requeued = 0; // 이미 파싱됐는데 내용이 바뀌어 재파싱 큐로 되돌린 행
    const rows = raw.map((r) => {
      const before = prev.get(`${r.source}:${r.source_id}`);
      // 조회에 실패했으면 '바뀌었다'고 단정하지 않는다. 새 행(before 없음)만 파싱 큐에 들어간다.
      const changed = lookupFailed ? false : before ? hash(before.raw_text ?? "") !== hash(r.raw_text) : true;
      if (changed && before?.parsed_at) requeued += 1;
      return {
        source: r.source,
        source_id: r.source_id,
        title: r.title,
        organization: r.organization,
        executing_org: r.executing_org,
        support_field: r.support_field_hint,
        apply_start: r.apply_start,
        apply_end: r.apply_end,
        is_rolling: r.is_rolling,
        original_url: r.original_url,
        apply_url: r.apply_url,
        raw_text: r.raw_text,
        attachment_url: r.attachment_url,
        // API가 구조화해서 준 조건은 코드가 만든 것이라 파싱 전에도 유효하다
        eligibility: { operator: "AND", conditions: r.structured_conditions },
        review_status: "ai_draft" as const,
        is_synthetic: false, // 실 수집 데이터. PUBLIC_DEMO=true면 화면에 나오지 않는다 (§0.1-6)
        // raw_text가 바뀐 것만 재파싱 큐로 되돌린다
        ...(changed ? { parsed_at: null } : {}),
        updated_at: new Date().toISOString(),
      };
    });

    const res = await db.from("programs").upsert(rows, { onConflict: "source,source_id" }).select("id");
    if (res.error) {
      run.failed += 1;
      notes.push(`upsert 실패: ${res.error.message}`);
    } else {
      run.upserted = res.data?.length ?? 0;
    }
    if (requeued > 0) notes.push(`내용 변경으로 재파싱 큐에 되돌린 기존 행 ${requeued}건`);
    log(`  upsert: ${run.upserted}건${requeued ? ` · 재파싱 큐 ${requeued}건` : ""}`);
    await update();
  }

  // ── 3. 파싱 (parsed_at IS NULL 인 것만) ────────────────────────────────────
  let docTypes: DocumentType[] = [];
  const docRes = await db.from("document_types").select("id,name,issuer,lead_time_days,issue_url,verified_at");
  if (!docRes.error) docTypes = (docRes.data ?? []) as DocumentType[];

  if (maxParse > 0) {
    const todo = await db
      .from("programs")
      .select("id,raw_text,eligibility,attachment_url,attachment_text")
      .is("parsed_at", null)
      .not("raw_text", "is", null)
      .limit(maxParse);

    const items = (todo.data ?? []) as {
      id: string; raw_text: string; eligibility: ConditionGroup;
      attachment_url: string | null; attachment_text: string | null;
    }[];
    log(`  파싱 대상: ${items.length}건`);

    await mapWithConcurrency(items, PARSE_CONCURRENCY, async (item) => {
      try {
        // 첨부파일(hwpx·pdf) 본문은 한 번만 뽑아 캐싱한다 — 같은 파일을 매번 다시 받지 않는다
        const attachmentText = item.attachment_url
          ? (item.attachment_text ?? (await fetchAttachmentText(item.attachment_url)))
          : null;
        const textForClaude = attachmentText ? `${item.raw_text}\n\n[첨부파일 본문 발췌]\n${attachmentText}` : item.raw_text;

        const { parsed, usage } = await parseAnnouncement(textForClaude);
        const post = postprocess(parsed, docTypes);
        // 구조화 조건(코드가 만든 것)을 앞에, AI 추출 조건을 뒤에. 같은 필드·연산은 구조화 쪽을 남긴다.
        const structured = (item.eligibility?.conditions ?? []) as (Condition | ConditionGroup)[];
        const seen = new Set(
          structured.filter((c): c is Condition => !("operator" in c)).map((c) => `${c.field}:${c.op}`),
        );
        const merged = [
          ...structured,
          ...post.eligibility.conditions.filter((c) => ("operator" in c) || !seen.has(`${c.field}:${c.op}`)),
        ];
        const res = await db.from("programs").update({
          support_field: parsed.support_field,
          support_type: parsed.support_type,
          amount_text: parsed.amount_text,
          summary: post.summary,
          eligibility: { operator: "AND", conditions: merged },
          unmapped_conditions: post.unmapped_conditions,
          required_documents: post.required_documents,
          attachment_text: attachmentText,
          parse_model: usage.model,
          parse_error: null,
          parsed_at: new Date().toISOString(),
        }).eq("id", item.id);
        if (res.error) throw new Error(res.error.message);
        run.parsed += 1;
      } catch (e) {
        run.failed += 1;
        await db.from("programs").update({
          parse_error: (e instanceof Error ? e.message : String(e)).slice(0, 500),
        }).eq("id", item.id);
      }
    });
    log(`  파싱 완료: ${run.parsed}건 (실패 ${run.failed})`);
    await update();
  }

  // ── 4. 임베딩 (embedding IS NULL 이고 파싱된 것만) ─────────────────────────
  const embedded: { id: string; vector: number[]; program: Program }[] = [];
  if (maxEmbed > 0) {
    const todo = await db
      .from("programs")
      .select("id,title,organization,amount_text,summary,apply_start,apply_end,is_rolling,raw_text")
      .is("embedding", null)
      .not("parsed_at", "is", null)
      .limit(maxEmbed);

    const items = (todo.data ?? []) as (Pick<Program, "id" | "title" | "organization" | "amount_text" | "summary" | "apply_start" | "apply_end" | "is_rolling"> & { raw_text: string | null })[];
    if (items.length > 0) {
      try {
        const { embeddings } = await embed(items.map((p) => buildEmbeddingText(p)));
        for (let i = 0; i < items.length; i += 1) {
          const res = await db.from("programs").update({ embedding: embeddings[i] }).eq("id", items[i].id);
          if (res.error) continue;
          run.embedded += 1;
          embedded.push({ id: items[i].id, vector: embeddings[i], program: items[i] as unknown as Program });
        }
      } catch (e) {
        run.failed += 1;
        notes.push(`임베딩 실패: ${e instanceof Error ? e.message : e}`);
      }
    }
    log(`  임베딩: ${run.embedded}건`);
    await update();
  }

  // ── 5. 중복 검사 (이번 런에서 임베딩된 것만) ───────────────────────────────
  for (const item of embedded) {
    const { data, error } = await db.rpc("match_programs", {
      query_embedding: JSON.stringify(item.vector),
      match_threshold: DEDUPE.review,
      match_count: 5,
      exclude_id: item.id,
    });
    if (error || !data) continue;

    for (const neighbor of data as { id: string; apply_start: string | null; apply_end: string | null; is_rolling: boolean; similarity: number }[]) {
      const overlap = periodsOverlap(item.program, neighbor);
      const similarity = neighbor.similarity ?? cosineSimilarity(item.vector, item.vector);
      const decision = decideDuplicate(similarity, overlap);

      const pair = await db.from("dedupe_pairs").upsert(
        {
          program_a: neighbor.id, program_b: item.id,
          similarity, period_overlap: overlap, decision, decided_by: "auto",
        },
        { onConflict: "program_a,program_b" },
      );
      if (pair.error) continue;

      if (decision === "duplicate") {
        // 나중에 수집된 쪽(이번 런의 항목)에 duplicate_of를 건다
        const res = await db.from("programs").update({ duplicate_of: neighbor.id }).eq("id", item.id);
        if (!res.error) run.deduped += 1;
        break;
      }
    }
  }
  log(`  중복 병합: ${run.deduped}건`);

  run.finishedAt = new Date().toISOString();
  run.notes = notes.join(" · ") || null;
  await update();
  return run;
}
