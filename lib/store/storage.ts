"use client";

// lib/store/storage.ts — localStorage 접근 (§3.4)
// localStorage는 작업 사본이다. 로그인한 계정의 원본은 서버(app_profiles)에 있고 sync.ts가 맞춘다.

export const STORAGE_KEYS = {
  profile: "bizbuddy:profile:v1",
  tasks: "bizbuddy:tasks:v1",
  settings: "bizbuddy:settings:v1",
  history: "bizbuddy:history:v1",
  drafts: "bizbuddy:drafts:v1", // 신청서 초안 (공고 id별)
  survey: "bizbuddy:survey:v1", // 작성 중인 회원 정보 설문 (기기 로컬 전용, 서버로 보내지 않는다)
  owner: "bizbuddy:owner:v1", // 이 기기 데이터의 주인(계정 id). 다른 계정이 로그인하면 지운다
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/** 서버 렌더·차단된 스토리지·깨진 JSON 어느 경우에도 fallback을 돌려준다 */
export function readJson<T>(key: StorageKey, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: StorageKey, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 용량 초과·프라이빗 모드 등 — 저장 실패해도 화면은 계속 동작한다
  }
}

export function removeKey(key: StorageKey): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // 무시
  }
}

/** 프로필 초기화 — bizbuddy:* 전체 삭제 (§8 S8) */
export function clearAll(): void {
  for (const key of Object.values(STORAGE_KEYS)) removeKey(key);
}

/** 내 데이터 내보내기(JSON) 용 스냅샷 */
export function exportAll(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, key] of Object.entries(STORAGE_KEYS)) {
    out[name] = readJson(key, null);
  }
  return { exportedAt: new Date().toISOString(), data: out };
}
