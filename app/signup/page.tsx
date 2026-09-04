import type { Metadata } from "next";

import { SignupScreen } from "@/components/screens/SignupScreen";
import { OnboardingShell } from "@/components/shell/OnboardingShell";

export const metadata: Metadata = {
  title: "회원가입 — 비즈버디",
  description: "아이디·비밀번호·사업자번호로 가입하고, AI와 대화하며 회사 정보를 만듭니다.",
};

export default function Page() {
  return (
    <OnboardingShell>
      <SignupScreen />
    </OnboardingShell>
  );
}
