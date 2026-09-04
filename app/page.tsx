"use client";

// "/" → 로그인 화면. 저장된 계정이 있으면 로그인 화면이 그 계정을 보여주고 한 번에 들어간다.

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
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
