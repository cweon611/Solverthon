// scripts/build-authored.ts — 사전 작성한 AI 결과(lib/ai-cache/authored*.ts)를 캐시 JSON으로 만든다.
//
//   npx tsx scripts/build-authored.ts
//
// · 신청서 초안: 공고의 제출서류·마감 경고를 붙여 DraftOutput으로 완성
// · 요건 코치: 데모 프로필 × 공고의 요건 행을 실제로 계산해, 요건별 설명을 조합해 CoachOutput으로 완성
// 둘 다 zod 스키마로 검증한다(화면이 기대하는 형태와 같아야 한다).
// Gemini가 만든 기존 캐시는 덮어쓰지 않는다 — 비어 있는 것만 채운다.

import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { CoachOutputZ, DraftOutputZ, type CoachOutput, type DraftOutput } from "../lib/ai/geminiSchemas";
import { AUTHORED_MODEL, COACH_ITEMS } from "../lib/ai-cache/authored";
import { AUTHORED_DRAFTS } from "../lib/ai-cache/authored-drafts";
import { coachKey } from "../lib/ai-cache/key";
import { loadDemoProfiles, toStoredProfile } from "../lib/data/demoProfiles";
import { loadSeedCatalog } from "../lib/data/seedRepository";
import { evaluateProgram, toFlatProfile } from "../lib/engine/evaluate";
import { fmtDate, fromIso } from "../lib/engine/format";
import { toGrant } from "../lib/view/toGrant";

const DRAFTS = "lib/ai-cache/drafts.json";
const COACH = "lib/ai-cache/coach.json";
const AVAILABLE = "lib/ai-cache/available.json";

const read = <T,>(p: string, fallback: T): T => (existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as T) : fallback);
const write = (p: string, v: unknown) => writeFileSync(p, JSON.stringify(v, null, 1) + "\n");

type DraftCache = Record<string, { draft: DraftOutput; model: string; generatedAt: string }>;
type CoachCache = Record<string, { programId: string; coach: CoachOutput; model: string; generatedAt: string }>;

// --force-authored: 이전에 작성해 둔 결과(AUTHORED_MODEL)만 다시 만든다. Gemini 결과는 건드리지 않는다
const forceAuthored = process.argv.includes("--force-authored");

const today = new Date();
const { programs } = loadSeedCatalog(today);
const now = new Date().toISOString();

// ── 신청서 초안 ──
const drafts = read<DraftCache>(DRAFTS, {});
let addedDrafts = 0;
for (const p of programs) {
  if (drafts[p.id] && !(forceAuthored && drafts[p.id].model === AUTHORED_MODEL)) continue; // Gemini가 만든 것 유지
  const a = AUTHORED_DRAFTS[p.id];
  if (!a) continue;
  const end = p.apply_end ? fromIso(p.apply_end) : null;
  const draft = DraftOutputZ.parse({
    title: a.title,
    overview: a.overview,
    evaluation_criteria: a.evaluation_criteria,
    sections: a.sections,
    documents: p.required_documents.map((d) => ({ name: d.name, is_required: d.is_required, note: "" })),
    warnings: [
      ...a.warnings,
      end ? `접수 마감 ${fmtDate(end)} — 서류 발급 기간을 고려해 미리 준비하세요.` : "상시 접수 사업입니다. 예산 소진 시 조기 마감될 수 있습니다.",
    ],
  } satisfies DraftOutput);
  drafts[p.id] = { draft, model: AUTHORED_MODEL, generatedAt: now };
  addedDrafts += 1;
}

// ── 요건 코치 ──
const coach = read<CoachCache>(COACH, {});
let addedCoach = 0;
const missing = new Set<string>();
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
    if (coach[key] && !(forceAuthored && coach[key].model === AUTHORED_MODEL)) continue;

    const items = rows.map((r) => ({ row: r, a: COACH_ITEMS[`${r.label}|${r.required}|${r.state}`] }));
    const unknown = items.filter((x) => !x.a);
    if (unknown.length > 0) {
      unknown.forEach((x) => missing.add(`${x.row.label}|${x.row.required}|${x.row.state}`));
      continue;
    }

    const fixable = items.find((x) => x.a!.can_fix_now) ?? items[0];
    const phrases = items.map((x) => x.a!.phrase);
    const summary =
      rows.length === 1
        ? `${p.title}은(는) ${phrases[0]}. 아래에서 이 요건의 뜻과 확인 방법을 정리했습니다. 판정을 바꾸는 것이 아니라, 무엇을 하면 되는지 알려 드리는 설명입니다.`
        : `${p.title}은(는) 남은 요건이 ${rows.length}가지입니다: ${phrases.join(" / ")}. 각 요건의 뜻과 확인 방법을 아래에 정리했습니다.`;

    const out = CoachOutputZ.parse({
      summary,
      items: items.map((x) => ({
        requirement: `${x.row.label} — ${x.row.required}`,
        meaning: x.a!.meaning,
        how_to_meet: x.a!.how_to_meet,
        where_to_check: x.a!.where_to_check,
        caution: x.a!.caution,
        can_fix_now: x.a!.can_fix_now,
      })),
      next_step: fixable.a!.next_step,
    } satisfies CoachOutput);
    coach[key] = { programId: p.id, coach: out, model: AUTHORED_MODEL, generatedAt: now };
    addedCoach += 1;
  }
}

write(DRAFTS, drafts);
write(COACH, coach);
write(AVAILABLE, { drafts: Object.keys(drafts), coach: Object.keys(coach) });
console.log(`신청서 초안 +${addedDrafts} (총 ${Object.keys(drafts).length}) · 요건 코치 +${addedCoach} (총 ${Object.keys(coach).length})`);
if (missing.size > 0) console.log(`설명이 없는 요건 ${missing.size}개:\n  ${[...missing].join("\n  ")}`);
