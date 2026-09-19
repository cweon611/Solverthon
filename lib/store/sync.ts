"use client";

// lib/store/sync.ts — 대회 제출용 데모 빌드: 서버 동기화가 없다.
// 원본 빌드는 로그인 계정의 데이터를 /api/sync로 서버와 맞추지만, 데모는 이 브라우저의 localStorage가 전부다.
// 화면이 기대하는 인터페이스(상태 구독·초기화)는 그대로 두고, 상태는 처음부터 "ready"다.

import { reloadAllStores } from "./persistent";
import { clearAll } from "./storage";

export type SyncStatus = "idle" | "pulling" | "ready" | "error";
export interface SyncSnapshot {
  status: SyncStatus;
  userId: string | null;
  lastSyncedAt: string | null;
  pushing: boolean;
  error: string | null;
}

const READY: SyncSnapshot = { status: "ready", userId: "demo", lastSyncedAt: null, pushing: false, error: null };

export const getSyncSnapshot = () => READY;
export const getServerSyncSnapshot = () => READY;
export function subscribeSync(): () => void {
  return () => {};
}

export function waitForSync(): Promise<SyncSnapshot> {
  return Promise.resolve(READY);
}

/** 초기화: 이 브라우저에 저장된 데모 데이터를 모두 지운다 */
export async function resetAll(): Promise<void> {
  clearAll();
  reloadAllStores();
}
