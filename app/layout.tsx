import type { Metadata } from "next";
import { JetBrains_Mono, Noto_Sans_KR, Outfit } from "next/font/google";
import "./globals.css";

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
      <body className="h-full font-sans text-ink bg-surface">{children}</body>
    </html>
  );
}
