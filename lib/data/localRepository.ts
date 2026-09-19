import "server-only";

// lib/data/localRepository.ts — DATA_MODE=local: scripts/ingest-local.ts가 만든 실공고 파일을 카탈로그로 쓴다.
// DB 없이 로컬에서 실공고로 시연하기 위한 모드다. 법정의무·서류 카탈로그는 시드를 그대로 쓴다.
// 파일은 git에서 제외되어 있어 공개 배포에는 들어가지 않는다 (§0.1-6).

import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import type { Program } from "@/lib/types";

import { loadSeedCatalog, type Catalog } from "./seedRepository";

const FILE = join(process.cwd(), "data/live/catalog.json");

interface LocalFile {
  fetchedAt: string;
  programs: Program[];
  rawText: Record<string, string>;
}

let cache: { mtime: number; data: LocalFile } | null = null;

function read(): LocalFile | null {
  if (!existsSync(FILE)) return null;
  const mtime = statSync(FILE).mtimeMs;
  if (!cache || cache.mtime !== mtime) cache = { mtime, data: JSON.parse(readFileSync(FILE, "utf8")) as LocalFile };
  return cache.data;
}

/** 마감이 지난 공고는 목록에서 뺀다 — 수집 뒤 시간이 지나도 모집 중인 것만 보인다 */
export function loadLocalCatalog(today: Date): (Catalog & { fetchedAt: string }) | null {
  const file = read();
  if (!file) return null;
  const iso = today.toISOString().slice(0, 10);
  const seed = loadSeedCatalog(today);
  return {
    programs: file.programs.filter((p) => p.is_rolling || (p.apply_end !== null && p.apply_end >= iso)),
    obligations: seed.obligations,
    documentTypes: seed.documentTypes,
    dualListedIds: [],
    fetchedAt: file.fetchedAt,
  };
}

export function loadLocalRawText(id: string): string | null {
  return read()?.rawText[id] ?? null;
}
