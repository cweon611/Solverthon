import { Suspense } from "react";

import type { Metadata } from "next";

import { OnboardingScreen } from "@/components/screens/OnboardingScreen";
import { OnboardingShell } from "@/components/shell/OnboardingShell";

export const metadata: Metadata = {
  title: "시작하기 — 비즈버디",
  description: "사업자 정보를 입력하면 받을 수 있는 지원사업과 지켜야 할 법정의무를 바로 판정합니다.",
};

// useSearchParams를 쓰는 클라이언트 컴포넌트는 <Suspense>로 감싼다 (§8 S0)
export default function OnboardingPage() {
  return (
    <OnboardingShell>
      <Suspense
        fallback={
          <div className="min-h-full bg-[#F5F6F8] flex items-center justify-center p-6">
            <div className="w-full max-w-xl h-96 bg-white border border-[#E4E6EA] rounded-3xl shadow-sm" />
          </div>
        }
      >
        <OnboardingScreen />
      </Suspense>
    </OnboardingShell>
  );
}
