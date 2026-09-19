// scripts/ingest-local.ts — DB 없이 실공고를 로컬 파일로 수집·파싱한다 (DATA_MODE=local)
//
//   npm run ingest:local -- --fetch 400        공식 API로 모집 중 공고 수집 (마감 제외) + 파싱
//   npm run ingest:local -- --parse 50          이미 받은 공고 중 미파싱분만 이어서 파싱
//
// 공식 오픈 API만 호출한다(§0.1-5). 결과는 data/live/catalog.json — git에서 제외되어 공개 저장소·데모 배포에 섞이지 않는다(§0.1-6).
// 파싱은 lib/ai/parse(Claude 키가 없으면 Gemini). 무료 한도가 있으니 --parse로 나눠 돌리고, 이미 파싱한 공고는 건너뛴다.

import { config } from "dotenv";
config({ path: ".env.local" });

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { parseAnnouncement, parseModelName } from "../lib/ai/parse";
import { postprocess } from "../lib/ai/postprocess";
import documentTypesJson from "../seed/document_types.json";
import { fetchBizinfo, isBizinfoEnabled } from "../lib/ingest/bizinfo";
import { fetchKstartup, isKstartupEnabled } from "../lib/ingest/kstartup";
import type { RawAnnouncement } from "../lib/ingest/normalize";
import type { Condition, ConditionGroup, DocumentType, Program } from "../lib/types";

export const LOCAL_CATALOG = "data/live/catalog.json";

export interface LocalCatalogFile {
  fetchedAt: string;
  sources: string[];
  programs: Program[];
  rawText: Record<string, string>; // program id → 원문 (AI 신청서 초안이 읽는다. 화면에는 내리지 않는다)
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

/** 모집 중: 마감일이 오늘 이후(당일 포함)이거나 상시. 접수 시작 전인 공고도 "곧 모집"이라 포함한다 */
function isOpen(r: RawAnnouncement): boolean {
  return r.is_rolling || (r.apply_end !== null && r.apply_end >= todayIso());
}

function toProgram(r: RawAnnouncement, now: string): Program {
  return {
    id: `${r.source === "kstartup" ? "ks" : "bi"}-${r.source_id}`,
    source: r.source,
    source_id: r.source_id,
    title: r.title,
    organization: r.organization,
    executing_org: r.executing_org,
    support_field: r.support_field_hint,
    support_type: null,
    amount_text: null,
    summary: null,
    apply_start: r.apply_start,
    apply_end: r.apply_end,
    is_rolling: r.is_rolling,
    original_url: r.original_url,
    apply_url: r.apply_url,
    attachment_url: r.attachment_url,
    eligibility: { operator: "AND", conditions: r.structured_conditions },
    unmapped_conditions: [],
    required_documents: [],
    review_status: "ai_draft",
    is_synthetic: false,
    duplicate_of: null,
    parsed_at: null,
    created_at: now,
    updated_at: now,
  };
}

function load(): LocalCatalogFile | null {
  if (!existsSync(LOCAL_CATALOG)) return null;
  return JSON.parse(readFileSync(LOCAL_CATALOG, "utf8")) as LocalCatalogFile;
}

function save(cat: LocalCatalogFile): void {
  mkdirSync(dirname(LOCAL_CATALOG), { recursive: true });
  writeFileSync(LOCAL_CATALOG, JSON.stringify(cat, null, 1));
}

async function collect(target: number): Promise<LocalCatalogFile> {
  const now = new Date().toISOString();
  const raw: RawAnnouncement[] = [];
  const sources: string[] = [];
  // 모집 중 필터(rcrt_prgs_yn=Y)를 걸어도 마감이 지난 공고가 섞일 수 있어 날짜로 한 번 더 거른다
  if (isKstartupEnabled()) {
    const got = await fetchKstartup({ maxFetch: target * 2, onlyOpen: true });
    raw.push(...got.filter(isOpen));
    sources.push("kstartup");
    console.log(`  K-Startup: ${got.length}건 받음 · 모집 중 ${got.filter(isOpen).length}건`);
  }
  if (isBizinfoEnabled()) {
    const got = await fetchBizinfo({ maxFetch: target });
    raw.push(...got.filter(isOpen));
    sources.push("bizinfo");
    console.log(`  기업마당: ${got.length}건 받음 · 모집 중 ${got.filter(isOpen).length}건`);
  }
  if (sources.length === 0) throw new Error("수집 API 키가 없습니다 (DATA_GO_KR_SERVICE_KEY 또는 BIZINFO_API_KEY).");

  // 이전 파일의 파싱 결과는 원문이 같으면 이어 쓴다 (다시 파싱하지 않는다)
  const prev = load();
  const prevById = new Map((prev?.programs ?? []).map((p) => [p.id, p]));
  const seen = new Set<string>();
  const programs: Program[] = [];
  const rawText: Record<string, string> = {};
  for (const r of raw) {
    const p = toProgram(r, now);
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    const old = prevById.get(p.id);
    const sameText = prev?.rawText[p.id] === r.raw_text;
    programs.push(old && sameText && old.parsed_at ? { ...old, apply_end: p.apply_end, apply_start: p.apply_start } : p);
    rawText[p.id] = r.raw_text;
    if (programs.length >= target) break;
  }
  // 마감 임박순으로 둔다 (상시는 뒤)
  programs.sort((a, b) => (a.apply_end ?? "9999").localeCompare(b.apply_end ?? "9999"));
  return { fetchedAt: now, sources, programs, rawText };
}

async function parseSome(cat: LocalCatalogFile, limit: number): Promise<void> {
  const docTypes = documentTypesJson as unknown as DocumentType[];
  const todo = cat.programs.filter((p) => !p.parsed_at).slice(0, limit);
  console.log(`  파싱: ${todo.length}건 (모델 ${parseModelName()}) · 남은 미파싱 ${cat.programs.filter((p) => !p.parsed_at).length}건`);
  let ok = 0;
  let fail = 0;
  let quotaStreak = 0; // 한도 초과(429)가 연속되면 모든 모델이 막힌 것 — 멈추고 다음 실행에 맡긴다
  for (const [i, p] of todo.entries()) {
    try {
      const { parsed, usage } = await parseAnnouncement(cat.rawText[p.id] ?? p.title);
      const post = postprocess(parsed, docTypes);
      // 구조화 조건(API 열거형으로 코드가 만든 것)을 앞에, AI 추출 조건을 뒤에. 같은 필드·연산은 구조화 쪽을 남긴다 (run.ts와 같은 규칙)
      const structured = p.eligibility.conditions as (Condition | ConditionGroup)[];
      const keys = new Set(structured.filter((c): c is Condition => !("operator" in c)).map((c) => `${c.field}:${c.op}`));
      const merged = [...structured, ...post.eligibility.conditions.filter((c) => "operator" in c || !keys.has(`${c.field}:${c.op}`))];
      Object.assign(p, {
        support_field: parsed.support_field,
        support_type: parsed.support_type,
        amount_text: parsed.amount_text,
        summary: post.summary,
        eligibility: { operator: "AND", conditions: merged },
        unmapped_conditions: post.unmapped_conditions,
        required_documents: post.required_documents,
        parsed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies Partial<Program>);
      ok += 1;
      quotaStreak = 0;
      process.stdout.write(`    [${i + 1}/${todo.length}] ✓ ${p.title.slice(0, 40)} (${usage.model}, ${(usage.ms / 1000).toFixed(1)}s)\n`);
    } catch (e) {
      fail += 1;
      const msg = (e instanceof Error ? e.message : String(e)).replace(/[A-Za-z0-9_-]{30,}/g, "…").slice(0, 120);
      process.stdout.write(`    [${i + 1}/${todo.length}] ✗ ${p.title.slice(0, 40)} — ${msg}\n`);
      quotaStreak = /429|quota|RESOURCE_EXHAUSTED/i.test(msg) ? quotaStreak + 1 : 0;
      if (quotaStreak >= 3) {
        console.log("  AI 사용 한도에 걸려 멈춥니다. 한도가 풀린 뒤 `npm run ingest:local -- --parse 100`으로 이어서 하세요.");
        break;
      }
    }
    if ((ok + fail) % 5 === 0) save(cat); // 중간 저장 — 끊겨도 진행분이 남는다
  }
  save(cat);
  console.log(`  파싱 완료 ${ok}건 · 실패 ${fail}건`);
}

async function main() {
  const fetchN = arg("fetch");
  const parseN = Number(arg("parse") ?? (fetchN ? "30" : "50"));
  let cat: LocalCatalogFile | null;
  if (fetchN) {
    console.log(`수집 (목표 ${fetchN}건, 마감 제외)`);
    cat = await collect(Number(fetchN));
    save(cat);
    console.log(`  저장: ${LOCAL_CATALOG} · ${cat.programs.length}건`);
  } else {
    cat = load();
    if (!cat) throw new Error(`${LOCAL_CATALOG}가 없습니다. 먼저 --fetch로 수집하세요.`);
  }
  if (parseN > 0) await parseSome(cat, parseN);
  const parsed = cat.programs.filter((p) => p.parsed_at).length;
  console.log(`\n현재: 공고 ${cat.programs.length}건 · 파싱 ${parsed}건 · 미파싱 ${cat.programs.length - parsed}건 (수집 ${cat.fetchedAt.slice(0, 16)})`);
}

main().catch((e) => { console.error("실패:", e instanceof Error ? e.message : e); process.exit(1); });
