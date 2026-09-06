// GrantsScreen · ExpiringScreen 이관분 중 button-variants/variants 테스트가 아직 기록하지 않은 자리.
// expected 문자열은 이관 전 소스(main e069224)에서 그대로 복사한 원문이고, 각 자리에 남아 있던
// 마지막 기록이다 — 화면이 바뀌면 여기서 먼저 깨진다.
// 비교는 다른 테이블 테스트와 같은 "정렬된 클래스 토큰 집합"이다(class 속성 순서는 캐스케이드와 무관).

import { describe, expect, it } from "vitest";

import { button } from "@/components/ui/button-variants";
import { badgeVariants, cardMutedVariants, cardVariants } from "@/components/ui/variants";
import { cn } from "@/lib/utils";

type Case = [site: string, actual: string, expected: string];

const tokens = (s: string) => [...new Set(s.trim().split(/\s+/).filter(Boolean))].sort();
const check = ([, actual, expected]: Case) => {
  expect(tokens(actual)).toEqual(tokens(expected));
};

/* ── 무테 카운트 배지 2곳 — 색이 상태·축에 달려 있어 tone: null ── */

const BORDERLESS_BADGES: Case[] = [
  [
    "GrantsScreen.tsx:60 (탭 카운트 · 선택됨)",
    cn(badgeVariants({ size: "sm", weight: "mono", bordered: false, tone: null }), "bg-[#6E62C2]/10 text-[#6E62C2]"),
    "text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#6E62C2]/10 text-[#6E62C2]",
  ],
  [
    "GrantsScreen.tsx:60 (탭 카운트 · 안 선택됨)",
    cn(badgeVariants({ size: "sm", weight: "mono", bordered: false, tone: null }), "bg-[#E4E6EA] text-[#888888]"),
    "text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#E4E6EA] text-[#888888]",
  ],
  [
    "ExpiringScreen.tsx:60 (업력)",
    cn(badgeVariants({ size: "sm", weight: "semibold", bordered: false, tone: null }), "bg-blue-500 text-white"),
    "text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-blue-500 text-white",
  ],
  [
    "ExpiringScreen.tsx:60 (대표자연령)",
    cn(badgeVariants({ size: "sm", weight: "semibold", bordered: false, tone: null }), "bg-purple-500 text-white"),
    "text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-purple-500 text-white",
  ],
  [
    "ExpiringScreen.tsx:60 (상시근로자)",
    cn(badgeVariants({ size: "sm", weight: "semibold", bordered: false, tone: null }), "bg-green-500 text-white"),
    "text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-green-500 text-white",
  ],
];

/* ── 카드 셸 4곳 ── */

const CARDS: Case[] = [
  [
    "GrantsScreen.tsx:78 (빈 상태 — 글자색·크기는 className)",
    cn(cardMutedVariants({ pad: "p8", center: true }), "text-[#888888] text-sm"),
    "bg-[#F5F6F8] rounded-2xl p-8 text-center text-[#888888] text-sm",
  ],
  [
    "GrantsScreen.tsx:276 (판정 기준 안내)",
    cn(cardMutedVariants({ pad: "p4" }), "text-xs text-[#888888]"),
    "bg-[#F5F6F8] rounded-2xl p-4 text-xs text-[#888888]",
  ],
  ["ExpiringScreen.tsx:97 (판정 기준 안내)", cn(cardMutedVariants({ pad: "p4" })), "bg-[#F5F6F8] rounded-2xl p-4"],
  // 이 카드만 자기 패딩이 px-5 py-4다. pad 축에 없는 값이라 className으로 넘긴다.
  [
    "GrantsScreen.tsx:280 (법정의무 행)",
    cn(cardVariants(), "px-5 py-4 flex items-start gap-4 hover:border-[#6E62C2]/20 transition-all"),
    "bg-white border border-[#E4E6EA] rounded-2xl px-5 py-4 flex items-start gap-4 shadow-sm hover:border-[#6E62C2]/20 transition-all",
  ],
];

/* ── <a>(ExtLink) · <Link> 버튼 흉내 8곳 — asChild가 없어 button()으로 className만 만든다 ── */

const LOOKALIKES: Case[] = [
  [
    "GrantsScreen.tsx:183 <ExtLink> (LINK_PRIMARY)",
    cn(button({ variant: "primary", pad: "4x2.5", text: "sm", radius: "xl", motion: "colors" }), "flex-1 text-center"),
    "flex-1 text-center text-sm font-semibold text-white bg-[#6E62C2] hover:bg-[#5a50a8] rounded-xl px-4 py-2.5 transition-colors cursor-pointer",
  ],
  // :186 <ExtLink> · :190 <Link> · :195 <Link> 세 곳이 바이트 단위로 같다(≡ CashflowScreen:222).
  [
    "GrantsScreen.tsx:186 · :190 · :195 (LINK_SOFT)",
    cn(button({ variant: "soft", pad: "4x2.5", text: "sm", radius: "xl", motion: "colors" }), "font-medium"),
    "px-4 py-2.5 text-sm font-medium text-[#6E62C2] bg-[#f0eef9] hover:bg-[#dddaf4] border border-[#dddaf4] rounded-xl transition-colors cursor-pointer",
  ],
  [
    "GrantsScreen.tsx:200 <ExtLink> (LINK_OUTLINE ≡ CashflowScreen:228)",
    cn(button({ variant: "outline", pad: "4x2.5", text: "sm", radius: "xl", motion: "colors" }), "bg-white font-medium"),
    "px-4 py-2.5 text-sm font-medium text-[#444444] bg-white hover:bg-[#F5F6F8] border border-[#E4E6EA] rounded-xl transition-colors cursor-pointer",
  ],
  // 펼친 행 안쪽 2종 — 글자 크기 유틸이 없다(부모 div의 text-xs를 상속받는다). text 축은 none이어야 한다.
  [
    "GrantsScreen.tsx:248 <ExtLink> · :251 <Link> (PILL_SOFT)",
    cn(button({ variant: "soft", pad: "3x1.5", radius: "lg", motion: "colors" }), "font-medium"),
    "text-[#6E62C2] bg-[#f0eef9] border border-[#dddaf4] px-3 py-1.5 rounded-lg font-medium cursor-pointer hover:bg-[#dddaf4] transition-colors",
  ],
  [
    "GrantsScreen.tsx:255 <ExtLink> (PILL_OUTLINE)",
    cn(button({ variant: "outline", pad: "3x1.5", radius: "lg", motion: "colors" }), "bg-white font-medium"),
    "text-[#444444] bg-white border border-[#E4E6EA] px-3 py-1.5 rounded-lg font-medium cursor-pointer hover:bg-[#F5F6F8] transition-colors",
  ],
  [
    "ExpiringScreen.tsx:87 <ExtLink> (CTA_LINK)",
    cn(button({ variant: "primary", pad: "4x2", text: "xs", radius: "xl", elevate: "brand", motion: "colors" }), "inline-block mt-3"),
    "inline-block mt-3 text-xs font-semibold bg-[#6E62C2] hover:bg-[#5a50a8] text-white px-4 py-2 rounded-xl transition-colors cursor-pointer shadow-md shadow-[#6E62C2]/25",
  ],
];

describe("무테 배지 (tone: null)", () => it.each(BORDERLESS_BADGES)("%s", (...c) => check(c)));
describe("카드 셸", () => it.each(CARDS)("%s", (...c) => check(c)));
describe("버튼 흉내 링크", () => it.each(LOOKALIKES)("%s", (...c) => check(c)));

describe("PILL 2종에는 글자 크기가 없다", () => {
  it("text 축이 새면 부모 상속이 끊긴다", () => {
    for (const s of [
      cn(button({ variant: "soft", pad: "3x1.5", radius: "lg", motion: "colors" }), "font-medium"),
      cn(button({ variant: "outline", pad: "3x1.5", radius: "lg", motion: "colors" }), "bg-white font-medium"),
    ]) {
      expect(tokens(s).some((t) => t.startsWith("text-[1") || t === "text-xs" || t === "text-sm")).toBe(false);
    }
  });
});
