import type { Metadata } from "next";

import { AdminScreen } from "@/components/screens/AdminScreen";
import { OnboardingShell } from "@/components/shell/OnboardingShell";

export const metadata: Metadata = { title: "관리자 — 비즈버디", robots: { index: false } };

export default function Page() {
  return (
    <OnboardingShell>
      <AdminScreen />
    </OnboardingShell>
  );
}
