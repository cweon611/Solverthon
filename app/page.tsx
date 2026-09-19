"use client";

// "/" → 대시보드. 데모에는 로그인이 없고, 프로필이 없으면 앱 셸이 설문(/onboarding)으로 보낸다.

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="size-full flex bg-white font-sans overflow-hidden" aria-busy="true" aria-label="불러오는 중">
      <aside className="w-56 shrink-0 bg-white border-r border-[#E4E6EA]" />
      <main className="flex-1 bg-white p-6 space-y-5">
        <div className="h-8 w-64 rounded-xl bg-[#F5F6F8]" />
        <div className="h-14 rounded-2xl bg-[#F5F6F8]" />
      </main>
    </div>
  );
}
