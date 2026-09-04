"use client";

// lib/store/sync.ts — 로그인 계정의 데이터를 서버(app_profiles)와 맞춘다.
//  · 로그인되면 서버에서 내려받아 localStorage에 쓴다 (서버가 원본).
//  · 서버가 비어 있고 이 기기에 데이터가 있으면(가입 직후·기존 사용자) 올린다.
//  · 이후 localStorage가 바뀌면 1.5초 뒤 한 번에 올린다. 프로필 변경은 바로 올린다.
//  · 다른 계정이 로그인하면 이 기기의 이전 계정 데이터는 지운다.
// 상태는 외부 스토어(useSyncExternalStore)로 둔다 — useEffect 안에서 setState를 부르지 않기 위해서다.

import { getSessionSnapshot, subscribeSession, logoutSession, type SessionUser } from "@/lib/auth/sessionStore";

import { onAnyChange, reloadAllStores } from "./persistent";
import { STORAGE_KEYS, clearAll, readJson, removeKey, writeJson, type StorageKey } from "./storage";

export type SyncStatus = "idle" | "pulling" | "ready" | "error";
export interface SyncSnapshot {
  status: SyncStatus;
  userId: string | null;
  lastSyncedAt: string | null;
  pushing: boolean;
  error: string | null;
}

/** 서버와 맞추는 키. owner는 기기 로컬 전용 */
export const SYNC_KEYS = ["profile", "tasks", "settings", "history", "drafts"] as const;
type SyncKey = (typeof SYNC_KEYS)[number];
export type SyncData = Partial<Record<SyncKey, unknown>>;

const INITIAL: SyncSnapshot = { status: "idle", userId: null, lastSyncedAt: null, pushing: false, error: null };
let snap: SyncSnapshot = INITIAL;
const listeners = new Set<() => void>();
const waiters = new Set<(s: SyncSnapshot) => void>();

function set(next: Partial<SyncSnapshot>): void {
  snap = { ...snap, ...next };
  listeners.forEach((l) => l());
  if (snap.status === "ready" || snap.status === "error") {
    waiters.forEach((w) => w(snap));
    waiters.clear();
  }
}

export const getSyncSnapshot = () => snap;
export const getServerSyncSnapshot = () => INITIAL;
export function subscribeSync(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** 지금 계정의 첫 동기화가 끝날 때까지 기다린다 */
export function waitForSync(): Promise<SyncSnapshot> {
  if (snap.status === "ready" || snap.status === "error") return Promise.resolve(snap);
  return new Promise((resolve) => waiters.add(resolve));
}

function collect(): SyncData {
  const out: SyncData = {};
  for (const k of SYNC_KEYS) out[k] = readJson(STORAGE_KEYS[k], null);
  return out;
}

function applyRemote(data: SyncData): void {
  for (const k of SYNC_KEYS) {
    const v = data[k];
    if (v === null || v === undefined) removeKey(STORAGE_KEYS[k]);
    else writeJson(STORAGE_KEYS[k], v);
  }
  reloadAllStores();
}

const readOwner = () => readJson<string | null>(STORAGE_KEYS.owner, null);

async function push(userId: string): Promise<void> {
  if (snap.userId !== userId) return;
  set({ pushing: true });
  try {
    const res = await fetch("/api/sync", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: collect() }),
    });
    if (res.ok) {
      const body = (await res.json()) as { updatedAt: string };
      set({ pushing: false, lastSyncedAt: body.updatedAt, error: null });
    } else {
      const body = await res.json().catch(() => null);
      set({ pushing: false, error: body?.error?.message ?? `저장 실패 (${res.status})` });
    }
  } catch {
    set({ pushing: false, error: "네트워크 오류로 저장하지 못했습니다." });
  }
}

async function pull(user: SessionUser): Promise<void> {
  set({ status: "pulling", userId: user.id, error: null });
  try {
    const res = await fetch("/api/sync", { cache: "no-store" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      set({ status: "error", error: body?.error?.message ?? `불러오기 실패 (${res.status})` });
      return;
    }
    const body = (await res.json()) as { data: SyncData | null; updatedAt: string | null };

    // 다른 계정의 로컬 데이터는 지운다
    const owner = readOwner();
    if (owner && owner !== user.id) {
      clearAll();
      reloadAllStores();
    }
    writeJson(STORAGE_KEYS.owner, user.id);

    const remoteHasProfile = body.data && body.data.profile;
    if (remoteHasProfile) {
      applyRemote(body.data!);
      set({ status: "ready", lastSyncedAt: body.updatedAt });
    } else {
      // 서버가 비어 있다 — 이 기기에 프로필이 있으면(가입 직후·기존 사용자) 올린다
      set({ status: "ready", lastSyncedAt: body.updatedAt });
      if (readJson(STORAGE_KEYS.profile, null)) await push(user.id);
    }
  } catch {
    set({ status: "error", error: "네트워크 오류로 불러오지 못했습니다." });
  }
}

/** 로그아웃: 세션을 끊고 이 기기의 사본을 지운다 (원본은 서버에 있다) */
export async function logoutAndClear(): Promise<void> {
  await logoutSession();
  clearAll();
  reloadAllStores();
  set({ ...INITIAL });
}

/** 초기화: 서버 원본과 이 기기 사본을 모두 비운다. 계정은 남는다 */
export async function resetAll(): Promise<void> {
  const userId = snap.userId;
  if (userId) {
    await fetch("/api/sync", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: {} }) }).catch(() => null);
  }
  clearAll();
  if (userId) writeJson(STORAGE_KEYS.owner, userId);
  reloadAllStores();
}

// ── 세션·로컬 변경 구독 (브라우저에서 모듈이 처음 로드될 때 한 번) ─────────────
if (typeof window !== "undefined") {
  let debounce: ReturnType<typeof setTimeout> | null = null;

  subscribeSession(() => {
    const s = getSessionSnapshot();
    if (s.status === "authed" && s.user) {
      if (snap.userId !== s.user.id || snap.status === "idle") void pull(s.user);
    } else if (s.status === "anon" || s.status === "unavailable") {
      if (snap.status !== "idle") set({ ...INITIAL });
    }
  });

  onAnyChange((key: StorageKey) => {
    const s = getSessionSnapshot();
    if (s.status !== "authed" || !s.user || snap.status !== "ready" || snap.userId !== s.user.id) return;
    if (key === STORAGE_KEYS.owner) return;
    const userId = s.user.id;
    if (debounce) clearTimeout(debounce);
    // 프로필은 바로, 나머지는 1.5초 모아서
    debounce = setTimeout(() => void push(userId), key === STORAGE_KEYS.profile ? 0 : 1500);
  });
}
