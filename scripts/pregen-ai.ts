// scripts/pregen-ai.ts — 데모용 AI 결과 사전 생성 (실제 Gemini 호출)
//
//   npx tsx scripts/pregen-ai.ts            아직 없는 것만 생성
//   npx tsx scripts/pregen-ai.ts --force    전부 다시 생성
//
// 데모 배포에는 AI 키를 두지 않는다. 대신 여기서 실제 Gemini로 신청서 AI 초안·요건 코치 결과를 만들어
// lib/ai-cache/*.json에 저장하고, 데모의 /api/ai/* 라우트가 그 결과를 재생한다.
// 결과는 진짜 AI 출력이다 — 손으로 쓴 내용이 없다. 화면에는 "사전 생성된 AI 결과"로 표시한다.
// 키는 원본 폴더의 .env.local(GEMINI_API)에서 읽는다.

import { config } from "dotenv";
config({ path: "../Solverthon/.env.local" });

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { generateJson, streamJson } from "../lib/ai/gemini";
import { COACH_SYSTEM, DRAFT_SYSTEM, buildCoachInput, buildDraftInput } from "../lib/ai/geminiPrompts";
import { CoachOutputZ, DraftOutputZ, type CoachOutput, type DraftOutput } from "../lib/ai/geminiSchemas";
import { buildProgramText } from "../lib/ai/programText";
import { coachKey } from "../lib/ai-cache/key";
import { loadDemoProfiles, toStoredProfile } from "../lib/data/demoProfiles";
import { loadSeedCatalog } from "../lib/data/seedRepository";
import { evaluateProgram, toFlatProfile } from "../lib/engine/evaluate";
import { toGrant } from "../lib/view/toGrant";

const DRAFTS = "lib/ai-cache/drafts.json";
const COACH = "lib/ai-cache/coach.json";

type DraftCache = Record<string, { draft: DraftOutput; model: string; generatedAt: string }>;
type CoachCache = Record<string, { programId: string; coach: CoachOutput; model: string; generatedAt: string }>;

const force = process.argv.includes("--force");
const read = <T,>(p: string, fallback: T): T => (existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as T) : fallback);
const write = (p: string, v: unknown) => { mkdirSync("lib/ai-cache", { recursive: true }); writeFileSync(p, JSON.stringify(v, null, 1) + "\n"); };

async function main() {
  const today = new Date();
  const { programs } = loadSeedCatalog(today);

  // ── 신청서 AI 초안: 공고별 1개 ──
  const drafts = read<DraftCache>(DRAFTS, {});
  for (const p of programs) {
    if (drafts[p.id] && !force) continue;
    try {
      const { data, usage } = await streamJson({
        system: DRAFT_SYSTEM, input: buildDraftInput(buildProgramText(p, null)), schema: DraftOutputZ,
        maxOutputTokens: 8192, onDelta: () => {},
      });
      drafts[p.id] = { draft: data, model: usage.model, generatedAt: new Date().toISOString() };
      write(DRAFTS, drafts);
      console.log(`  초안 ✓ ${p.id} ${p.title.slice(0, 30)} (${usage.model}, ${(usage.ms / 1000).toFixed(1)}s)`);
    } catch (e) {
      console.log(`  초안 ✗ ${p.id} — ${(e instanceof Error ? e.message : String(e)).slice(0, 120)}`);
    }
  }

  // ── 요건 코치: 데모 프로필 × (대상이 아닌) 공고의 미충족·확인필요 요건 조합 ──
  const coach = read<CoachCache>(COACH, {});
  for (const demo of loadDemoProfiles(today)) {
    const flat = toFlatProfile(toStoredProfile(demo), today);
    for (const p of programs) {
      const grant = toGrant(p, evaluateProgram(p, flat, today));
      if (grant.status === "pass") continue;
      const rows = (grant.eligibility ?? [])
        .filter((e) => e.state !== "pass")
        .map((e) => ({ label: e.label, required: e.required, sourceText: e.sourceText, state: e.state as "fail" | "check" }))
        .slice(0, 15);
      if (rows.length === 0) continue;
      const key = coachKey(p.id, rows);
      if (coach[key] && !force) continue;
      try {
        const { data, usage } = await generateJson({
          system: COACH_SYSTEM,
          input: buildCoachInput({ title: p.title, organization: p.organization, summary: p.summary, criteria: rows }),
          schema: CoachOutputZ,
        });
        coach[key] = { programId: p.id, coach: data, model: usage.model, generatedAt: new Date().toISOString() };
        write(COACH, coach);
        console.log(`  코치 ✓ ${demo.id} × ${p.id} (${rows.length}행, ${usage.model})`);
      } catch (e) {
        console.log(`  코치 ✗ ${demo.id} × ${p.id} — ${(e instanceof Error ? e.message : String(e)).slice(0, 120)}`);
      }
    }
  }

  // 화면이 버튼을 보일지 정하는 목록(키만) — 결과 본문은 클라이언트 번들에 넣지 않는다
  write("lib/ai-cache/available.json", { drafts: Object.keys(drafts), coach: Object.keys(coach) });
  console.log(`\n초안 ${Object.keys(drafts).length}건 · 코치 ${Object.keys(coach).length}건 저장`);
}

main().catch((e) => { console.error(e); process.exit(1); });
