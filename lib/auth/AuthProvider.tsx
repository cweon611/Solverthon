"use client";

// lib/auth/AuthProvider.tsx — 세션 훅. 상태는 sessionStore(외부 스토어)에 있고 여기서는 구독만 한다.

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

import {
  getServerSessionSnapshot,
  getSessionSnapshot,
  logoutSession,
  refreshSession,
  subscribeSession,
  type AuthStatus,
  type SessionSnapshot,
  type SessionUser,
} from "./sessionStore";

export type { AuthStatus, SessionUser };

interface AuthValue extends SessionSnapshot {
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const snap = useSyncExternalStore(subscribeSession, getSessionSnapshot, getServerSessionSnapshot);
  const value = useMemo<AuthValue>(() => ({ ...snap, refresh: refreshSession, logout: logoutSession }), [snap]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSession(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useSession은 <AuthProvider> 안에서만 사용할 수 있습니다.");
  return ctx;
}
