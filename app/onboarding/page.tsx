import { Suspense } from "react";

import type { Metadata } from "next";

import { SurveyScreen } from "@/components/screens/SurveyScreen";
import { OnboardingShell } from "@/components/shell/OnboardingShell";
import { loadCatalog } from "@/lib/data/repository";
import { CatalogProvider } from "@/lib/store/CatalogProvider";

export const metadata: Metadata = {
  title: "시작하기 — 비즈버디",
  description: "설문에 답하면 받을 수 있는 지원사업과 지켜야 할 법정의무를 바로 판정합니다.",
};

// 설문 옆 판정 미리보기가 카탈로그를 쓴다 — (app) 레이아웃과 같은 주기로 읽는다
export const revalidate = 300;

// useSearchParams를 쓰는 클라이언트 컴포넌트는 <Suspense>로 감싼다 (§8 S0)
export default async function OnboardingPage() {
  const catalog = await loadCatalog(new Date());
  return (
    <OnboardingShell>
      <CatalogProvider value={catalog}>
        <Suspense
          fallback={
            <div className="min-h-full bg-[#F5F6F8] flex items-center justify-center p-6">
              <div className="w-full max-w-4xl h-[560px] bg-white border border-[#E4E6EA] rounded-3xl shadow-sm" />
            </div>
          }
        >
          <SurveyScreen />
        </Suspense>
      </CatalogProvider>
    </OnboardingShell>
  );
}
