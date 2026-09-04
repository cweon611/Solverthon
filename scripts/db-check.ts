// scripts/db-check.ts — Supabase 스키마·데이터 점검, 두 모드 판정 대조
// 실행: npm run db:check
import { config } from "dotenv";
config({ path: ".env.local" });

import { loadDemoProfiles, toStoredProfile } from "../lib/data/demoProfiles";
import { loadSeedCatalog } from "../lib/data/seedRepository";
import { loadSupabaseCatalog } from "../lib/data/supabaseRepository";
import { requireSupabase } from "../lib/data/supabase";
import { evaluateProgram, toFlatProfile } from "../lib/engine/evaluate";
import { computeExpiringList } from "../lib/engine/expiry";
import { announcementStatus } from "../lib/view/toAnnouncement";
import { toGrant } from "../lib/view/toGrant";
import type { Catalog } from "../lib/data/seedRepository";

const TODAY = new Date();
const TABLES = ["programs", "obligations", "document_types", "dedupe_pairs", "ingest_runs"];

function summarize(cat: Catalog, profile: ReturnType<typeof toStoredProfile>) {
  const flat = toFlatProfile(profile, TODAY);
  const open = cat.programs.filter((p) => announcementStatus(p, TODAY) !== "closed");
  const grants = open.map((p) => toGrant(p, evaluateProgram(p, flat, TODAY)));
  const verdicts = cat.programs.map((p) => evaluateProgram(p, flat, TODAY));
  const by = (s: string) => grants.filter((g) => g.status === s).map((g) => g.name).sort();
  return {
    pass: by("pass"), conditional: by("conditional"), fail: by("fail"),
    expiring: computeExpiringList(cat.programs, verdicts, flat, TODAY)
      .map((e) => `${e.grantName}|${e.axis}|${e.expiresIn ?? "채용시"}`),
  };
}

async function main() {
  const db = requireSupabase();
  console.log("── 스키마");
  let bad = 0;
  for (const t of TABLES) {
    const { error, count } = await db.from(t).select("id", { count: "exact" }).limit(1);
    if (error) { console.log(`  ✗ ${t.padEnd(15)} ${error.message}`); bad += 1; }
    else console.log(`  ✓ ${t.padEnd(15)} ${count ?? 0}행`);
  }

  console.log("\n── 두 모드 판정 대조");
  const seed = loadSeedCatalog(TODAY);
  const supa = await loadSupabaseCatalog(false);
  for (const demo of loadDemoProfiles(TODAY)) {
    const p = toStoredProfile(demo);
    const a = summarize(seed, p), b = summarize(supa, p);
    const same = JSON.stringify(a) === JSON.stringify(b);
    if (!same) bad += 1;
    console.log(`  ${same ? "✓" : "✗"} ${demo.demo_label} — 대상 ${b.pass.length} · 조건부 ${b.conditional.length} · 제외 ${b.fail.length} · 소멸 ${b.expiring.length}`);
  }
  console.log(bad === 0 ? "\n이상 없음." : `\n문제 ${bad}건`);
  process.exit(bad === 0 ? 0 : 1);
}
main().catch((e) => { console.error("실패:", e instanceof Error ? e.message : e); process.exit(2); });
