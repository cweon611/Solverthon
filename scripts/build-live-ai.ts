// scripts/build-live-ai.ts — 수집한 실공고에 대한 AI 결과를 캐시에 넣는다 (DATA_MODE=local 시연용)
//
//   npx tsx scripts/build-live-ai.ts            파싱이 끝난 실공고 전부
//   npx tsx scripts/build-live-ai.ts --limit 20  앞에서 20건만
//
// 초안 목차는 lib/ai-cache/live-specs.ts(공고 성격별), 코치 설명은 lib/ai-cache/coach-generic.ts(요건 유형별)에
// 미리 써 둔 것을 쓰고, 공고 제목·제출서류·요건 문구 같은 사실은 수집 데이터에서 채운다.

import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { CoachOutputZ, DraftOutputZ, type CoachOutput, type DraftOutput } from "../lib/ai/geminiSchemas";
import { AUTHORED_MODEL, COACH_ITEMS } from "../lib/ai-cache/authored";
import { genericCoachItem } from "../lib/ai-cache/coach-generic";
import { coachKey } from "../lib/ai-cache/key";
import { LIVE_SPECS, pickLiveKind } from "../lib/ai-cache/live-specs";
import { loadDemoProfiles, toStoredProfile } from "../lib/data/demoProfiles";
import { evaluateProgram, toFlatProfile } from "../lib/engine/evaluate";
import { fmtDate, fromIso } from "../lib/engine/format";
import type { Program } from "../lib/types";
import { toGrant } from "../lib/view/toGrant";

const LIVE = "data/live/catalog.json";
const DRAFTS = "lib/ai-cache/drafts.json";
const COACH = "lib/ai-cache/coach.json";
const AVAILABLE = "lib/ai-cache/available.json";

const read = <T,>(p: string, fallback: T): T => (existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as T) : fallback);
const write = (p: string, v: unknown) => writeFileSync(p, JSON.stringify(v, null, 1) + "\n");

const argLimit = process.argv.indexOf("--limit");
const limit = argLimit >= 0 ? Number(process.argv[argLimit + 1]) : Infinity;

if (!existsSync(LIVE)) {
  console.error(`${LIVE}가 없습니다. 먼저 npm run ingest:local로 실공고를 수집하세요.`);
  process.exit(1);
}

const today = new Date();
const now = new Date().toISOString();
const live = JSON.parse(readFileSync(LIVE, "utf8")) as { programs: Program[] };
// 파싱이 끝난 공고만 — 조건이 없으면 초안·코치를 만들 근거가 없다
const targets = live.programs.filter((p) => p.parsed_at).slice(0, limit);

const drafts = read<Record<string, { draft: DraftOutput; model: string; generatedAt: string }>>(DRAFTS, {});
const coach = read<Record<string, { programId: string; coach: CoachOutput; model: string; generatedAt: string }>>(COACH, {});

let addedDrafts = 0;
for (const p of targets) {
  if (drafts[p.id]) continue;
  const spec = LIVE_SPECS[pickLiveKind(p)];
  const end = p.apply_end ? fromIso(p.apply_end) : null;
  drafts[p.id] = {
    draft: DraftOutputZ.parse({
      title: `${p.title} 신청서`,
      overview: `${spec.overview} (공고 성격: ${spec.label} · 주관 ${p.organization})`,
      evaluation_criteria: spec.criteria.map((c) => ({ ...c, weight_text: "공고에서 배점 확인" })),
      sections: spec.sections,
      documents: p.required_documents.map((d) => ({ name: d.name, is_required: d.is_required, note: "" })),
      warnings: [
        ...spec.warnings,
        end ? `접수 마감 ${fmtDate(end)} — 서류 발급 기간을 고려해 미리 준비하세요.` : "상시 접수 사업입니다. 예산 소진 시 조기 마감될 수 있습니다.",
        "이 목차는 공고 성격에 맞춘 표준 구성입니다. 공고에 지정 서식이 있으면 그 서식을 따르세요.",
      ],
    } satisfies DraftOutput),
    model: AUTHORED_MODEL,
    generatedAt: now,
  };
  addedDrafts += 1;
}

let addedCoach = 0;
for (const demo of loadDemoProfiles(today)) {
  const flat = toFlatProfile(toStoredProfile(demo), today);
  for (const p of targets) {
    const grant = toGrant(p, evaluateProgram(p, flat, today));
    if (grant.status === "pass") continue;
    const rows = (grant.eligibility ?? [])
      .filter((e) => e.state !== "pass")
      .map((e) => ({ label: e.label, required: e.required, sourceText: e.sourceText, state: e.state as "fail" | "check" }))
      .slice(0, 15);
    if (rows.length === 0) continue;
    const key = coachKey(p.id, rows);
    if (coach[key]) continue;

    const items = rows.map((r) => COACH_ITEMS[`${r.label}|${r.required}|${r.state}`] ?? genericCoachItem(r));
    const fixable = items.find((i) => i.can_fix_now) ?? items[0];
    const summary =
      rows.length === 1
        ? `${p.title}은(는) ${items[0].phrase}. 아래에서 이 요건의 뜻과 확인 방법을 정리했습니다. 판정을 바꾸는 것이 아니라, 무엇을 하면 되는지 알려 드리는 설명입니다.`
        : `${p.title}은(는) 확인할 요건이 ${rows.length}가지입니다: ${items.map((i) => i.phrase).join(" / ")}. 각 요건의 뜻과 확인 방법을 아래에 정리했습니다.`;

    coach[key] = {
      programId: p.id,
      coach: CoachOutputZ.parse({
        summary,
        items: items.map((a, i) => ({
          requirement: `${rows[i].label} — ${rows[i].required}`.slice(0, 300),
          meaning: a.meaning,
          how_to_meet: a.how_to_meet,
          where_to_check: a.where_to_check,
          caution: a.caution,
          can_fix_now: a.can_fix_now,
        })),
        next_step: fixable.next_step,
      } satisfies CoachOutput),
      model: AUTHORED_MODEL,
      generatedAt: now,
    };
    addedCoach += 1;
  }
}

write(DRAFTS, drafts);
write(COACH, coach);
write(AVAILABLE, { drafts: Object.keys(drafts), coach: Object.keys(coach) });
console.log(`실공고 ${targets.length}건 · 초안 +${addedDrafts} · 코치 +${addedCoach} (총 초안 ${Object.keys(drafts).length} · 코치 ${Object.keys(coach).length})`);
