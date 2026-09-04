"use client";

// lib/store/ProfileProvider.tsx — 기업 프로필 (localStorage "bridge:profile:v1")
// 서버로 전송하지 않는다 (§0.1-4).

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

import type { CompanyProfile } from "@/lib/types";

import { invalidateAllStores, useHydrated, usePersistent } from "./persistent";
import { STORAGE_KEYS, clearAll } from "./storage";

interface ProfileContextValue {
  profile: CompanyProfile | null;
  /** localStorage를 읽기 전에는 false — 이때 리다이렉트를 판단하면 안 된다 (§4.3) */
  isLoaded: boolean;
  save: (profile: CompanyProfile) => void;
  reset: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = usePersistent<CompanyProfile | null>(STORAGE_KEYS.profile, null);
  const isLoaded = useHydrated();

  const save = useCallback(
    (next: CompanyProfile) => setProfile({ ...next, updated_at: new Date().toISOString() }),
    [setProfile],
  );

  const reset = useCallback(() => {
    clearAll();
    invalidateAllStores();
  }, []);

  const value = useMemo<ProfileContextValue>(
    () => ({ profile, isLoaded, save, reset }),
    [profile, isLoaded, save, reset],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfileStore(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfileStore는 <ProfileProvider> 안에서만 사용할 수 있습니다.");
  return ctx;
}
