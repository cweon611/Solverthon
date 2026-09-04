import type { Metadata } from "next";

import { InterviewScreen } from "@/components/screens/InterviewScreen";
import { OnboardingShell } from "@/components/shell/OnboardingShell";

export const metadata: Metadata = {
  title: "대화로 시작하기 — 비즈버디",
  description: "AI가 묻는 질문에 답하면 회사 정보와 사업 방향을 정리해 드립니다.",
};

export default function Page() {
  return (
    <OnboardingShell>
      <InterviewScreen />
    </OnboardingShell>
  );
}
