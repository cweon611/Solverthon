"use client";

// lib/auth/sessionStore.ts — 세션 상태를 외부 스토어로 둔다. 첫 구독 때 /api/auth/me를 한 번 부른다.
// useEffect 안에서 setState를 부르지 않기 위해(react-hooks/set-state-in-effect) useSyncExternalStore로 구독한다.

export interface SessionUser {
  id: string;
  loginId: string;
  bizNo: string; // 숫자 10자리
  isAdmin: boolean;
}
export type AuthStatus = "loading" | "anon" | "authed" | "unavailable";

export interface SessionSnapshot {
  status: AuthStatus;
  user: SessionUser | null;
  unavailableMessage: string | null;
}

// 대회 제출용 데모: 로그인이 없다. 모든 방문자는 같은 데모 사용자로 "로그인된" 상태이고,
// 데이터는 이 브라우저(localStorage)에만 저장된다. 서버 세션·계정 API는 이 빌드에 없다.
const DEMO_USER: SessionUser = { id: "demo", loginId: "demo", bizNo: "", isAdmin: false };
const INITIAL: SessionSnapshot = { status: "authed", user: DEMO_USER, unavailableMessage: null };
const SERVER: SessionSnapshot = INITIAL;

const snapshot: SessionSnapshot = INITIAL;
const listeners = new Set<() => void>();

export function getSessionSnapshot(): SessionSnapshot {
  return snapshot;
}
export function getServerSessionSnapshot(): SessionSnapshot {
  return SERVER;
}

/** 데모: 물을 서버가 없다 */
export function refreshSession(): Promise<void> {
  return Promise.resolve();
}

export async function logoutSession(): Promise<void> {
  // 데모에는 로그아웃이 없다
}

export function subscribeSession(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
