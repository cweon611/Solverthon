// scripts/verify-law.ts — 국가법령정보센터에서 조문을 확인해 시드에 기록한다 (§7.4)
// 실행: npm run law:verify
//
// 앱 런타임에서는 절대 호출하지 않는다. 이 API는 호출 서버의 IP/도메인을 사전 등록해야 하고
// 트래픽 정책이 비공개라, 개발자가 로컬에서 한 번 돌려 결과를 시드에 남기는 방식으로 쓴다.
//
// 확인되지 않은 항목은 legal_checked_at을 null로 둔다. 빈칸을 추정으로 채우지 않는다 (§0.1-8).

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { Obligation } from "../lib/types";

const SEARCH = "https://www.law.go.kr/DRF/lawSearch.do";
const SERVICE = "https://www.law.go.kr/DRF/lawService.do";
const AUTH_FAIL = "사용자 정보 검증에 실패";
const EXCERPT_MAX = 300;
const DELAY_MS = 400;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const today = () => new Date().toISOString().slice(0, 10);

interface Extended extends Obligation {
  law_mst?: string | null;
  effective_date?: string | null;
  legal_source_url?: string | null;
  verified_by?: string | null;
}

/**
 * 조문 응답에서 사람이 읽는 부분만 뽑는다.
 * 조문단위는 단건 객체와 다건 배열이 모두 오고, 그 안에 조문번호·시행일자·조문키 같은
 * 메타데이터가 섞여 있다. 내용에 해당하는 키만 골라야 발췌가 읽을 만해진다.
 */
const CONTENT_KEYS = new Set(["조문내용", "항내용", "호내용", "목내용", "조문제목"]);

function collectText(node: unknown, out: string[], depth = 0): void {
  if (depth > 8 || node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (const n of node) collectText(n, out, depth + 1);
    return;
  }
  if (typeof node !== "object") return;

  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (CONTENT_KEYS.has(key)) {
      if (typeof value === "string") {
        const s = value.replace(/\s+/g, " ").trim();
        if (s && !out.includes(s)) out.push(s);
      } else {
        collectText(value, out, depth + 1);
      }
    } else if (typeof value === "object") {
      collectText(value, out, depth + 1);
    }
  }
}

async function getJson(url: URL): Promise<{ ok: true; json: unknown } | { ok: false; reason: string }> {
  const res = await fetch(url, { cache: "no-store" });
  const body = await res.text();
  if (body.includes(AUTH_FAIL)) return { ok: false, reason: "auth" };
  if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
  try {
    return { ok: true, json: JSON.parse(body) };
  } catch {
    return { ok: false, reason: "JSON 아님" };
  }
}

async function main() {
  const oc = process.env.LAW_GO_KR_OC;
  if (!oc) {
    console.error("LAW_GO_KR_OC가 없습니다. .env.local을 확인하세요.");
    process.exit(1);
  }

  const path = resolve(process.cwd(), "seed/obligations.json");
  const obligations = JSON.parse(readFileSync(path, "utf8")) as Extended[];

  // 같은 법령을 여러 의무가 공유하므로 법령명 → MST를 한 번만 조회한다
  const mstCache = new Map<string, { mst: string; effective: string | null } | null>();
  let verified = 0;
  let skipped = 0;

  for (const ob of obligations) {
    const basis = ob.legal_basis;
    if (!basis) { skipped += 1; continue; }

    // 1) 법령명으로 MST 조회
    if (!mstCache.has(basis.law_name)) {
      const url = new URL(SEARCH);
      url.searchParams.set("OC", oc);
      url.searchParams.set("target", "law");
      url.searchParams.set("type", "JSON");
      url.searchParams.set("query", basis.law_name);

      const r = await getJson(url);
      if (!r.ok) {
        if (r.reason === "auth") {
          console.error("\n국가법령정보센터가 인증을 거부했습니다.");
          console.error("이 API는 호출 서버의 IP/도메인을 open.law.go.kr에 사전 등록해야 합니다.");
          console.error("등록 전까지는 사람이 law.go.kr 화면에서 조문을 확인하고");
          console.error("legal_checked_at·legal_source_url을 직접 기록하세요 (verified_by: \"manual\").");
          console.error("\n시드는 수정하지 않았습니다.");
          process.exit(1);
        }
        mstCache.set(basis.law_name, null);
      } else {
        const laws = (r.json as { LawSearch?: { law?: unknown } })?.LawSearch?.law;
        const list = Array.isArray(laws) ? laws : laws ? [laws] : [];
        const hit = (list as Record<string, string>[]).find((l) => l["법령명한글"]?.trim() === basis.law_name);
        mstCache.set(
          basis.law_name,
          hit ? { mst: String(hit["법령일련번호"]), effective: hit["시행일자"] ?? null } : null,
        );
      }
      await sleep(DELAY_MS);
    }

    const found = mstCache.get(basis.law_name);
    if (!found) {
      console.log(`  ✗ ${ob.id}  ${basis.law_name} — 법령을 찾지 못했습니다`);
      skipped += 1;
      continue;
    }

    // 2) MST + 조 번호로 조문 조회
    const url = new URL(SERVICE);
    url.searchParams.set("OC", oc);
    url.searchParams.set("target", "law");
    url.searchParams.set("type", "JSON");
    url.searchParams.set("MST", found.mst);
    url.searchParams.set("JO", basis.jo_code);

    const r = await getJson(url);
    await sleep(DELAY_MS);
    if (!r.ok) {
      console.log(`  ✗ ${ob.id}  조문 조회 실패 (${r.reason})`);
      skipped += 1;
      continue;
    }

    const article = (r.json as { 법령?: { 조문?: { 조문단위?: unknown } } })?.법령?.조문?.조문단위;
    const parts: string[] = [];
    collectText(article, parts);
    const excerpt = parts.join(" ").replace(/\s+/g, " ").trim().slice(0, EXCERPT_MAX);

    if (!excerpt) {
      console.log(`  ✗ ${ob.id}  조문 내용이 비어 있습니다 (JO=${basis.jo_code})`);
      skipped += 1;
      continue;
    }

    ob.legal_text_excerpt = excerpt;
    ob.legal_checked_at = today();
    ob.law_mst = found.mst;
    ob.effective_date = found.effective;
    ob.legal_source_url = `https://www.law.go.kr/DRF/lawService.do?OC=&target=law&type=HTML&MST=${found.mst}&JO=${basis.jo_code}`;
    ob.verified_by = "api";
    verified += 1;
    console.log(`  ✓ ${ob.id}  ${basis.law_name} ${basis.article}`);
  }

  writeFileSync(path, JSON.stringify(obligations, null, 2) + "\n", "utf8");
  console.log(`\n확인 ${verified}건 · 미확인 ${skipped}건`);
  console.log("미확인 항목은 legal_checked_at이 null로 남아 화면에 \"확인 중\" 배지가 붙습니다.");
  if (verified > 0) console.log("Supabase에도 반영하려면 npm run seed:db 를 다시 실행하세요.");
}

main().catch((e) => {
  console.error("실패:", e instanceof Error ? e.message : e);
  process.exit(1);
});
