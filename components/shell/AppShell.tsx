"use client";

// design/BridgePage.tsx 1687–1707행 BridgePage 루트 → 앱 셸(§4.2).
// page 상태 → 라우팅. main의 overflow 클래스는 pathname === '/calendar' 조건 유지.
// 세션이 없으면 /login, 세션은 있는데 이 기기에 프로필이 없으면 /onboarding/chat 으로 보낸다.
// 읽는 중에는 스켈레톤만 그리고 잘못된 리다이렉트를 하지 않는다 (§4.3).

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { AuthProvider, useSession } from "@/lib/auth/AuthProvider";
import { useSyncState } from "@/lib/store/useSync";
import type { CatalogResult } from "@/lib/data/repository";
import { CatalogProvider } from "@/lib/store/CatalogProvider";
import { HistoryProvider } from "@/lib/store/HistoryProvider";
import { ProfileProvider, useProfileStore } from "@/lib/store/ProfileProvider";
import { SettingsProvider } from "@/lib/store/SettingsProvider";
import { TasksProvider } from "@/lib/store/TasksProvider";

import { Sidebar } from "./Sidebar";

function ShellSkeleton() {
  return (
    <div className="size-full flex bg-white font-sans overflow-hidden" aria-busy="true" aria-label="불러오는 중">
      <aside className="w-56 shrink-0 bg-white border-r border-[#E4E6EA] flex flex-col">
        <div className="px-5 py-5 border-b border-[#E4E6EA]"><div className="h-8 rounded-xl bg-[#F5F6F8]" /></div>
        <div className="px-4 py-4 border-b border-[#E4E6EA]"><div className="h-16 rounded-xl bg-[#F5F6F8]" /></div>
        <div className="flex-1 px-3 py-3 space-y-0.5">
          {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-10 rounded-xl bg-[#F5F6F8]" />)}
        </div>
      </aside>
      <main className="flex-1 bg-white overflow-hidden">
        <div className="p-6 space-y-5">
          <div className="h-8 w-64 rounded-xl bg-[#F5F6F8]" />
          <div className="h-14 rounded-2xl bg-[#F5F6F8]" />
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }, (_, i) => <div key={i} className="h-28 rounded-2xl bg-[#F5F6F8]" />)}
          </div>
          <div className="h-40 rounded-2xl bg-[#F5F6F8]" />
        </div>
      </main>
    </div>
  );
}

function ShellGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, isLoaded } = useProfileStore();
  const { status } = useSession();
  const sync = useSyncState();
  // 서버에서 내려받기가 끝난(또는 실패해 로컬로 가는) 뒤에만 프로필 유무를 판단한다
  const settled = sync.status === "ready" || sync.status === "error";

  useEffect(() => {
    if (status === "anon" || status === "unavailable") router.replace("/login");
    else if (status === "authed" && settled && isLoaded && !profile) router.replace("/onboarding/chat");
  }, [status, settled, isLoaded, profile, router]);

  // 세션·서버 동기화·localStorage를 읽기 전에는 판단하지 않는다
  if (status !== "authed" || !settled || !isLoaded || !profile) return <ShellSkeleton />;

  return (
    <div className="size-full flex bg-white font-sans overflow-hidden">
      <Sidebar />
      <main className={`flex-1 bg-white ${pathname === "/calendar" ? "overflow-hidden" : "overflow-y-auto"}`}>
        {children}
      </main>
    </div>
  );
}

export function AppShell({ catalog, children }: { catalog: CatalogResult; children: ReactNode }) {
  return (
    <AuthProvider>
      <CatalogProvider value={catalog}>
        <ProfileProvider>
          <SettingsProvider>
            <HistoryProvider>
              <TasksProvider>
                <ShellGuard>{children}</ShellGuard>
              </TasksProvider>
            </HistoryProvider>
          </SettingsProvider>
        </ProfileProvider>
      </CatalogProvider>
    </AuthProvider>
  );
}
