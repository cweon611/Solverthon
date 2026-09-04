// scripts/ingest.ts — 수집 파이프라인 로컬 실행 (§7.5)
// 예: npm run ingest -- --source kstartup --region 광주 --maxFetch 30 --maxParse 5
import { config } from "dotenv";
config({ path: ".env.local" });

import { runIngest } from "../lib/ingest/run";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const num = (name: string) => { const v = arg(name); return v === undefined ? undefined : Number(v); };

async function main() {
  const sources = arg("source")?.split(",") as ("kstartup" | "bizinfo")[] | undefined;
  console.log("수집 시작");
  const run = await runIngest({
    sources,
    maxFetch: num("maxFetch"),
    maxParse: num("maxParse"),
    maxEmbed: num("maxEmbed"),
    region: arg("region"),
    log: (m) => console.log(m),
  });
  console.log("\n결과");
  console.log(`  수집 ${run.fetched} · 적재 ${run.upserted} · 파싱 ${run.parsed} · 임베딩 ${run.embedded} · 중복 ${run.deduped} · 실패 ${run.failed}`);
  if (run.notes) console.log(`  비고: ${run.notes}`);
  console.log(`  ingest_runs id=${run.id}`);
}
main().catch((e) => { console.error("실패:", e instanceof Error ? e.message : e); process.exit(1); });
