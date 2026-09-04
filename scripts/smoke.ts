// scripts/smoke.ts — 배포 전후 통합 스모크 (§12.2)
// 실행: npm run smoke              (로컬 http://localhost:3000)
//       npm run smoke -- --base https://<배포주소>
//
// AI 파싱은 돈이 드므로 기본으로 건너뛴다. --with-ai 를 붙이면 프리셋 1건을 실제로 파싱한다.

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { loadDemoProfiles, toStoredProfile } from "../lib/data/demoProfiles";
import { evaluateProgram, toFlatProfile } from "../lib/engine/evaluate";
import { announcementStatus } from "../lib/view/toAnnouncement";
import { toGrant } from "../lib/view/toGrant";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (name: string) => process.argv.includes(`--${name}`);

const BASE = (arg("base") ?? "http://localhost:3000").replace(/\/$/, "");
const WITH_AI = has("with-ai");

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = "") {
  if (ok) { passed += 1; console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`); }
  else { failed += 1; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); }
}

async function main() {
  console.log(`대상: ${BASE}\n`);

  // ── /api/health ────────────────────────────────────────────────────────────
  console.log("health");
  const health = await fetch(`${BASE}/api/health`);
  check("200 응답", health.status === 200, `HTTP ${health.status}`);
  const h = (await health.json()) as {
    ok: boolean; dataMode: string; publicDemo: boolean;
    adapters: Record<string, boolean>; ai: Record<string, boolean>;
  };
  check("dataMode가 seed 또는 supabase", ["seed", "supabase"].includes(h.dataMode), h.dataMode);
  check("응답에 키 값이 없다", !JSON.stringify(h).match(/sb_secret|sk-ant|pa-/), "존재 여부만 노출");
  console.log(`    publicDemo=${h.publicDemo} · 파싱 ${h.ai.parse} · 임베딩 ${h.ai.embed}`);

  // ── /api/programs ──────────────────────────────────────────────────────────
  console.log("\nprograms");
  const progRes = await fetch(`${BASE}/api/programs?includeClosed=true`);
  check("200 응답", progRes.status === 200, `HTTP ${progRes.status}`);
  const body = await progRes.text();
  const programs = JSON.parse(body) as { id: string; is_synthetic: boolean }[];
  check("공고가 1건 이상", programs.length > 0, `${programs.length}건`);
  check("embedding 필드가 없다", !body.includes('"embedding"'));
  check("raw_text 필드가 없다", !body.includes('"raw_text"'));
  if (h.publicDemo) {
    const real = programs.filter((p) => !p.is_synthetic).length;
    check("PUBLIC_DEMO에서 실수집 데이터가 노출되지 않는다", real === 0, `실수집 ${real}건`);
  } else {
    console.log("    (PUBLIC_DEMO=false — 합성 필터 검사 생략)");
  }

  const single = await fetch(`${BASE}/api/programs/${programs[0].id}`);
  check("단건 조회 200", single.status === 200);
  const missing = await fetch(`${BASE}/api/programs/does-not-exist`);
  check("없는 id는 404", missing.status === 404, `HTTP ${missing.status}`);

  // ── 가드레일 ───────────────────────────────────────────────────────────────
  console.log("\n가드레일");
  const tooBig = await fetch(`${BASE}/api/ai/parse`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "가".repeat(13_000) }),
  });
  check("13,000자 → 413", tooBig.status === 413, `HTTP ${tooBig.status}`);

  const ingest = await fetch(`${BASE}/api/ingest`);
  check("인증 없는 수집 요청은 거부", [401, 503].includes(ingest.status), `HTTP ${ingest.status}`);

  let rateLimited = false;
  for (let i = 0; i < 12; i += 1) {
    const r = await fetch(`${BASE}/api/ai/parse`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
    });
    if (r.status === 429) { rateLimited = true; break; }
  }
  check("연속 호출 시 429", rateLimited);

  // ── 실수집 카탈로그 불변식 (2026-09-04: 합성 공고 제거 후) ───────────────────
  console.log("\n실수집 카탈로그");
  const today = new Date();
  const catRes = await fetch(`${BASE}/api/programs?includeClosed=true`);
  const live = (await catRes.json()) as { is_synthetic: boolean; original_url: string | null; apply_end: string | null; is_rolling: boolean }[];
  check("공고가 있다", live.length > 0, `${live.length}건`);
  check("합성 공고가 없다", live.every((p) => !p.is_synthetic), `합성 ${live.filter((p) => p.is_synthetic).length}건`);
  check("원문 링크가 전부 있다", live.every((p) => Boolean(p.original_url)), `누락 ${live.filter((p) => !p.original_url).length}건`);

  // 데모 프로필마다 실공고 '대상'이 최소 1건은 나와야 판정함이 비지 않는다
  const full = (await (await fetch(`${BASE}/api/programs`)).json()) as Parameters<typeof evaluateProgram>[0][];
  for (const demo of loadDemoProfiles(today)) {
    const flat = toFlatProfile(toStoredProfile(demo), today);
    const grants = full
      .filter((p) => announcementStatus(p, today) !== "closed")
      .map((p) => toGrant(p, evaluateProgram(p, flat, today)));
    const pass = grants.filter((g) => g.status === "pass").length;
    const cond = grants.filter((g) => g.status === "conditional").length;
    const fail = grants.filter((g) => g.status === "fail").length;
    check(demo.demo_label, pass >= 1, `대상 ${pass} · 조건부 ${cond} · 제외 ${fail}`);
  }

  // ── AI 파싱 (옵션) ─────────────────────────────────────────────────────────
  if (WITH_AI) {
    console.log("\nAI 파싱 (--with-ai)");
    const text = readFileSync(resolve(process.cwd(), "seed/announcements/01_광주_청년일자리도약장려금.txt"), "utf8");
    const res = await fetch(`${BASE}/api/ai/parse`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }),
    });
    const sse = await res.text();
    check("final 이벤트 수신", sse.includes('"type":"final"'));
    check("error 이벤트 없음", !sse.includes('"type":"error"'));
  } else {
    console.log("\nAI 파싱은 건너뜀 (--with-ai 로 실행 가능, 건당 약 $0.03)");
  }

  console.log(`\n통과 ${passed} · 실패 ${failed}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => { console.error("스모크 실패:", e instanceof Error ? e.message : e); process.exit(1); });
