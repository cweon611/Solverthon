"use client";

// 온보딩은 앱 셸(사이드바) 없이 뜨지만 프로필·이력 저장소는 필요하다 (§8 S0).

import type { ReactNode } from "react";

import { AuthProvider } from "@/lib/auth/AuthProvider";
import { HistoryProvider } from "@/lib/store/HistoryProvider";
import { ProfileProvider } from "@/lib/store/ProfileProvider";
import { useSyncState } from "@/lib/store/useSync";

function SyncBoot() {
  useSyncState(); // 구독만 — 세션이 생기면 sync.ts가 서버와 맞춘다
  return null;
}

export function OnboardingShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ProfileProvider>
        <HistoryProvider>
          <SyncBoot />
          {children}
        </HistoryProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}
