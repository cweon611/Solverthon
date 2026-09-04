"use client";

// lib/store/HistoryProvider.tsx — 판정 이력 (localStorage "bridge:history:v1")

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

import type { HistoryEntry } from "@/lib/types";

import { usePersistent } from "./persistent";
import { STORAGE_KEYS } from "./storage";

interface HistoryContextValue {
  entries: HistoryEntry[];
  push: (entry: HistoryEntry) => void;
}

const HistoryContext = createContext<HistoryContextValue | null>(null);

const EMPTY: HistoryEntry[] = [];
const MAX_ENTRIES = 50;

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = usePersistent<HistoryEntry[]>(STORAGE_KEYS.history, EMPTY);

  const push = useCallback(
    (entry: HistoryEntry) => setEntries((prev) => [entry, ...prev].slice(0, MAX_ENTRIES)),
    [setEntries],
  );

  const value = useMemo<HistoryContextValue>(() => ({ entries, push }), [entries, push]);

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}

export function useHistoryStore(): HistoryContextValue {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error("useHistoryStore는 <HistoryProvider> 안에서만 사용할 수 있습니다.");
  return ctx;
}
