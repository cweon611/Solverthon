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

const INITIAL: SessionSnapshot = { status: "loading", user: null, unavailableMessage: null };
const SERVER: SessionSnapshot = INITIAL;

let snapshot: SessionSnapshot = INITIAL;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(next: SessionSnapshot): void {
  snapshot = next;
  listeners.forEach((l) => l());
}

export function getSessionSnapshot(): SessionSnapshot {
  return snapshot;
}
export function getServerSessionSnapshot(): SessionSnapshot {
  return SERVER;
}

/** /api/auth/me 를 다시 묻는다. 동시에 여러 곳이 부르면 한 번만 나간다 */
export function refreshSession(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const body = (await res.json()) as { user: SessionUser };
        set({ status: "authed", user: body.user, unavailableMessage: null });
      } else if (res.status === 503) {
        const body = await res.json().catch(() => null);
        set({ status: "unavailable", user: null, unavailableMessage: body?.error?.message ?? "인증 서버가 준비되지 않았습니다." });
      } else {
        set({ status: "anon", user: null, unavailableMessage: null });
      }
    } catch {
      set({ status: "anon", user: null, unavailableMessage: null });
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export async function logoutSession(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
  set({ status: "anon", user: null, unavailableMessage: null });
}

export function subscribeSession(cb: () => void): () => void {
  listeners.add(cb);
  // 첫 구독자가 붙을 때 아직 모르는 상태면 서버에 묻는다 — 외부 시스템 구독의 일부다
  if (snapshot.status === "loading" && !inflight && typeof window !== "undefined") void refreshSession();
  return () => {
    listeners.delete(cb);
  };
}
