import type { ReactNode } from "react";

import { AppShell } from "@/components/shell/AppShell";
import { loadCatalog } from "@/lib/data/repository";

// 서버 컴포넌트 (§3.3-4). 카탈로그(공개 데이터)만 여기서 읽는다. 프로필은 클라이언트가 세션으로 /api/sync에서 받는다.
export const revalidate = 300;

export default async function AppLayout({ children }: { children: ReactNode }) {
  const catalog = await loadCatalog(new Date());
  return <AppShell catalog={catalog}>{children}</AppShell>;
}
