import type { Metadata } from "next";

import { LoginScreen } from "@/components/screens/LoginScreen";
import { OnboardingShell } from "@/components/shell/OnboardingShell";

export const metadata: Metadata = {
  title: "로그인 — 비즈버디",
  description: "이 기기에 저장된 계정으로 계속하거나, AI와 대화하며 회원가입합니다.",
};

export default function Page() {
  return (
    <OnboardingShell>
      <LoginScreen />
    </OnboardingShell>
  );
}
