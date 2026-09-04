"use client";

import { useSyncExternalStore } from "react";

import type { AdminStats } from "./stats";

export interface StatsSnapshot {
  status: "idle" | "loading" | "ready" | "error";
  data: AdminStats | null;
  error: string | null;
  httpStatus: number | null;
}

const INITIAL: StatsSnapshot = { status: "idle", data: null, error: null, httpStatus: null };
let snap: StatsSnapshot = INITIAL;
const listeners = new Set<() => void>();
const set = (next: Partial<StatsSnapshot>) => {
  snap = { ...snap, ...next };
  listeners.forEach((l) => l());
};

export async function loadStats(): Promise<void> {
  set({ status: "loading", error: null });
  try {
    const res = await fetch("/api/admin/stats", { cache: "no-store" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      set({ status: "error", error: body?.error?.message ?? `불러오기 실패 (${res.status})`, httpStatus: res.status });
      return;
    }
    set({ status: "ready", data: (await res.json()) as AdminStats, httpStatus: 200 });
  } catch {
    set({ status: "error", error: "네트워크 오류", httpStatus: null });
  }
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  if (snap.status === "idle" && typeof window !== "undefined") void loadStats();
  return () => {
    listeners.delete(cb);
  };
}

export function useAdminStats(): StatsSnapshot {
  return useSyncExternalStore(subscribe, () => snap, () => INITIAL);
}
