import type { Metadata } from "next";
import { JetBrains_Mono, Noto_Sans_KR, Outfit } from "next/font/google";
import "./globals.css";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

// §4.4: 'korean' 서브셋은 존재하지 않음 — 한글 글리프는 unicode-range로 자동 로드
const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "비즈버디 — 초기 창업기업 지원사업·법정의무 알리미",
  description: "사업자 정보 몇 가지만 입력하면 받을 수 있는 지원사업, 지켜야 할 법정의무, 곧 사라질 자격을 먼저 알려주는 푸시형 알리미.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${notoSansKr.variable} ${outfit.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      {/* 전역 공급자 두 개. 둘 다 파일 맨 위에 "use client"가 있는 클라이언트 컴포넌트라
          서버 컴포넌트인 이 파일에서 그대로 렌더할 수 있다 — 따로 감싸는 파일을 만들지 않는다.
          children은 서버에서 만든 그대로 슬롯으로 통과하므로 클라이언트 경계가 넓어지지 않는다.
          · TooltipProvider: <Tooltip> 하나라도 공급자 밖에 있으면 예외가 난다. 앱에 하나만 둔다.
          · Toaster: 토스트가 붙는 자리. 라우트 이동 뒤에도 살아 있어야 해서 루트에 둔다
            (초기화 후 /onboarding/chat으로 넘어가며 뜨는 토스트가 이 배치에 기댄다). */}
      <body className="h-full font-sans text-ink bg-surface">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
