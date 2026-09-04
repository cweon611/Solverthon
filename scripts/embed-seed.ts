// scripts/embed-seed.ts — 시드 프로그램을 Voyage로 임베딩해 seed/embeddings.json 생성 (§7.2)
// 실행: npm run seed:embed   (Supabase 불필요)
import { config } from "dotenv";
config({ path: ".env.local" });

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { embed, getEmbedModel } from "../lib/ai/voyage";
import { loadSeedProgramsIncludingDuplicates } from "../lib/data/seedRepository";
import { buildEmbeddingText, cosineSimilarity, decideDuplicate, periodsOverlap } from "../lib/engine/dedupe";

async function main() {
  const programs = loadSeedProgramsIncludingDuplicates(new Date());
  const texts = programs.map((p) => buildEmbeddingText({ ...p, raw_text: null }));
  console.log(`${programs.length}건 임베딩 (${getEmbedModel()})...`);

  const { embeddings, dimension, totalTokens } = await embed(texts);
  const out: Record<string, number[]> = {};
  programs.forEach((p, i) => { out[p.id] = embeddings[i]; });

  const path = resolve(process.cwd(), "seed/embeddings.json");
  writeFileSync(path, JSON.stringify(out), "utf8");
  console.log(`저장: seed/embeddings.json (${dimension}차원, ${totalTokens} 토큰)\n`);

  // §11 Phase 4 완료 기준 검증
  const byId = new Map(programs.map((p) => [p.id, p]));
  const check = (a: string, b: string, label: string) => {
    const pa = byId.get(a)!, pb = byId.get(b)!;
    const sim = cosineSimilarity(out[a], out[b]);
    const overlap = periodsOverlap(pa, pb);
    console.log(`  ${label.padEnd(12)} ${a}↔${b}  유사도 ${sim.toFixed(4)}  기간겹침 ${overlap ? "✓" : "✗"}  → ${decideDuplicate(sim, overlap)}`);
    return sim;
  };
  console.log("중복 판별 검증:");
  const d1 = check("seed-01", "seed-21", "중복쌍1");
  const d2 = check("seed-02", "seed-22", "중복쌍2");
  const n1 = check("seed-03", "seed-23", "비중복쌍");

  const ok = d1 >= 0.92 && d2 >= 0.92 && n1 < 0.85;
  console.log(ok ? "\n기준 충족: 중복 ≥ 0.92, 비중복 < 0.85" : "\n기준 미달 — 시드 요약 문구 조정 필요");
  process.exit(ok ? 0 : 1);
}
main().catch((e) => { console.error("실패:", e instanceof Error ? e.message : e); process.exit(1); });
