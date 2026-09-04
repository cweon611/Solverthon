"use client";

// lib/store/CatalogProvider.tsx — 서버가 로드한 카탈로그를 클라이언트로 주입 (§3.3-4)
// 카탈로그는 공개 데이터라 서버에서 오고, 프로필은 브라우저에만 있다. 판정은 둘을 클라이언트에서 합친다.

import { createContext, useContext, type ReactNode } from "react";

import type { CatalogResult } from "@/lib/data/repository";

const CatalogContext = createContext<CatalogResult | null>(null);

export function CatalogProvider({ value, children }: { value: CatalogResult; children: ReactNode }) {
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalogData(): CatalogResult {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalogData는 <CatalogProvider> 안에서만 사용할 수 있습니다.");
  return ctx;
}
