import "server-only";

// lib/data/repository.ts — 카탈로그 공급원 선택 (§3.4)
// SUPABASE_URL이 없으면 자동으로 seed. Supabase 조회가 실패해도 시드로 되돌아가 화면이 비지 않게 한다.

import type { CatalogMeta, Program } from "@/lib/types";

import { loadSeedCatalog, type Catalog } from "./seedRepository";
import { loadLastSyncedAt, loadProgramRawText, loadSupabaseCatalog } from "./supabaseRepository";

export type DataMode = "seed" | "supabase";

/** 환경변수는 서버에서만 읽는다 (§0.1-3). 값이 아니라 모드만 밖으로 나간다 */
export function getDataMode(): DataMode {
  const explicit = process.env.DATA_MODE;
  if (explicit === "seed" || explicit === "supabase") return explicit;
  return process.env.SUPABASE_URL ? "supabase" : "seed";
}

export function isPublicDemo(): boolean {
  return process.env.PUBLIC_DEMO === "true";
}

export interface CatalogResult extends Catalog {
  meta: CatalogMeta;
}

export async function loadCatalog(today: Date): Promise<CatalogResult> {
  const mode = getDataMode();
  const publicDemo = isPublicDemo();

  if (mode === "supabase") {
    try {
      const [catalog, syncedAt] = await Promise.all([loadSupabaseCatalog(publicDemo), loadLastSyncedAt()]);
      if (catalog.programs.length > 0) {
        return { ...catalog, meta: { mode: "supabase", syncedAt } };
      }
      console.warn("[repository] Supabase에 프로그램이 없습니다. 시드로 대체합니다. (npm run seed:db 필요)");
    } catch (e) {
      console.error("[repository] Supabase 조회 실패, 시드로 대체합니다:", e instanceof Error ? e.message : e);
    }
  }

  const catalog = loadSeedCatalog(today);
  // 공개 배포는 합성 데이터만 노출한다 (§0.1-6)
  const programs = publicDemo ? catalog.programs.filter((p) => p.is_synthetic) : catalog.programs;
  return { ...catalog, programs, meta: { mode: "seed", syncedAt: null } };
}

/** 공고 1건 + (있으면) 원문. AI 라우트 전용 — 원문은 응답에 싣지 않고 프롬프트에만 쓴다 */
export async function loadProgramForAi(id: string, today: Date): Promise<{ program: Program; rawText: string | null } | null> {
  const { programs } = await loadCatalog(today);
  const program = programs.find((p) => p.id === id);
  if (!program) return null;
  const rawText = getDataMode() === "supabase" ? await loadProgramRawText(id) : null;
  return { program, rawText };
}
