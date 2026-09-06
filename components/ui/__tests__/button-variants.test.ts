// button-variants.ts가 저장소의 실제 <button> 클래스 문자열을 그대로 재현하는지 검증한다.
// JSX·React import 없음(vitest node 환경).
//
// 비교는 "정렬된 클래스 토큰 집합"으로 한다. cva는 base → variant 순으로 이어붙이므로
// 원본 소스와 문자열 순서가 다른 것이 정상이고, CSS 우선순위는 class 속성 순서가 아니라
// 생성된 스타일시트 순서가 정한다.
//
// expected 문자열은 전부 소스에서 그대로 복사한 것이다(주석의 파일:줄 = <button> 태그 줄).

import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

import {
  BRAND_SHADOW,
  BUTTON_BASE,
  CHIP_BASE,
  SELECT_CARD_BASE,
  button,
  chip,
  segmented,
  selectCard,
  type ButtonVariants,
  type ChipVariants,
  type SegmentedVariants,
  type SelectCardVariants,
} from "../button-variants";

type Case = [site: string, actual: string, expected: string];

const tokens = (s: string) => [...new Set(s.trim().split(/\s+/).filter(Boolean))].sort();

const check = ([, actual, expected]: Case) => {
  expect(tokens(actual)).toEqual(tokens(expected));
};

// <Button>이 실제로 하는 일과 동일하게 감싼다: cn(button(...), className)
const btn = (o: ButtonVariants, extra?: string) => cn(button(o), extra);
const ch = (o: ChipVariants, extra?: string) => cn(chip(o), extra);
const seg = (o: SegmentedVariants, extra?: string) => cn(segmented(o), extra);
// selectCard는 cn을 통과시키지 않는다(아래 "cn 주의" 참고).
const card = (o: SelectCardVariants) => selectCard(o);

/* ───────────────────────── primary 20곳 ───────────────────────── */

const PRIMARY: Case[] = [
  [
    "OnboardingScreen.tsx:402",
    btn({ variant: "primary", pad: "5x2", text: "sm", radius: "xl", elevate: "brand", motion: "colors", off: "o40flat" }),
    "px-5 py-2 rounded-xl bg-[#6E62C2] text-white text-sm font-semibold hover:bg-[#5a50a8] transition-colors cursor-pointer shadow-md shadow-[#6E62C2]/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none",
  ],
  [
    "OnboardingScreen.tsx:407",
    btn({ variant: "primary", pad: "5x2", text: "sm", radius: "xl", elevate: "brand", motion: "colors", off: "o40" }),
    "px-5 py-2 rounded-xl bg-[#6E62C2] text-white text-sm font-semibold hover:bg-[#5a50a8] transition-colors cursor-pointer shadow-md shadow-[#6E62C2]/25 disabled:opacity-40 disabled:cursor-not-allowed",
  ],
  [
    "DedupeDemoScreen.tsx:140",
    btn({ variant: "primary", pad: "5x2", text: "sm", radius: "xl", elevate: "brand", motion: "colors", off: "o40" }, "flex items-center gap-2"),
    "flex items-center gap-2 px-5 py-2 rounded-xl bg-[#6E62C2] text-white text-sm font-semibold hover:bg-[#5a50a8] transition-colors cursor-pointer shadow-md shadow-[#6E62C2]/25 disabled:opacity-40 disabled:cursor-not-allowed",
  ],
  [
    "DedupeDemoScreen.tsx:161",
    btn({ variant: "primary", pad: "5x2", text: "sm", radius: "xl", elevate: "brand", motion: "colors", off: "o40" }, "flex items-center gap-2"),
    "flex items-center gap-2 px-5 py-2 rounded-xl bg-[#6E62C2] text-white text-sm font-semibold hover:bg-[#5a50a8] transition-colors cursor-pointer shadow-md shadow-[#6E62C2]/25 disabled:opacity-40 disabled:cursor-not-allowed",
  ],
  [
    "ParseDemoScreen.tsx:154",
    btn({ variant: "primary", pad: "5x2", text: "sm", radius: "xl", elevate: "brand", motion: "colors", off: "o40" }, "flex items-center gap-2"),
    "flex items-center gap-2 px-5 py-2 rounded-xl bg-[#6E62C2] text-white text-sm font-semibold hover:bg-[#5a50a8] transition-colors cursor-pointer shadow-md shadow-[#6E62C2]/25 disabled:opacity-40 disabled:cursor-not-allowed",
  ],
  [
    "InterviewScreen.tsx:140",
    btn({ variant: "primary", pad: "5x2.5", text: "sm", radius: "xl", elevate: "brand", motion: "colors" }),
    "px-5 py-2.5 rounded-xl bg-[#6E62C2] text-white text-sm font-semibold hover:bg-[#5a50a8] transition-colors cursor-pointer shadow-md shadow-[#6E62C2]/25",
  ],
  [
    "InterviewScreen.tsx:215",
    btn({ variant: "primary", pad: "4x2.5", text: "sm", radius: "xl", elevate: "brand", motion: "colors", block: true, off: "o40flat" }),
    "w-full px-4 py-2.5 rounded-xl bg-[#6E62C2] text-white text-sm font-semibold hover:bg-[#5a50a8] transition-colors cursor-pointer shadow-md shadow-[#6E62C2]/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none",
  ],
  [
    "CashflowScreen.tsx:432",
    btn({ variant: "primary", pad: "4x2.5", text: "sm", radius: "xl", elevate: "brand", motion: "colors", off: "wait" }),
    "px-4 py-2.5 rounded-xl bg-[#6E62C2] text-white text-sm font-semibold hover:bg-[#5a50a8] transition-colors cursor-pointer shadow-md shadow-[#6E62C2]/25 disabled:opacity-60 disabled:cursor-wait",
  ],
  [
    "InterviewScreen.tsx:175",
    btn({ variant: "primary", pad: "4x2.5", text: "sm", radius: "xl", motion: "colors", off: "o40" }),
    "px-4 py-2.5 rounded-xl bg-[#6E62C2] text-white text-sm font-semibold hover:bg-[#5a50a8] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
  ],
  [
    "LoginScreen.tsx:84",
    btn({ variant: "primary", pad: "5x3", text: "sm", radius: "2xl", elevate: "brand", motion: "colors", block: true }),
    "w-full px-5 py-3 rounded-2xl bg-[#6E62C2] text-white text-sm font-semibold hover:bg-[#5a50a8] transition-colors cursor-pointer shadow-md shadow-[#6E62C2]/25",
  ],
  [
    "LoginScreen.tsx:113",
    btn({ variant: "primary", pad: "5x3", text: "sm", radius: "2xl", elevate: "brand", motion: "colors", block: true, off: "o50" }),
    "w-full px-5 py-3 rounded-2xl bg-[#6E62C2] text-white text-sm font-semibold hover:bg-[#5a50a8] transition-colors cursor-pointer shadow-md shadow-[#6E62C2]/25 disabled:opacity-50 disabled:cursor-not-allowed",
  ],
  [
    "SignupScreen.tsx:99",
    btn({ variant: "primary", pad: "5x3", text: "sm", radius: "2xl", elevate: "brand", motion: "colors", block: true, off: "o50" }, "mt-2"),
    "w-full mt-2 px-5 py-3 rounded-2xl bg-[#6E62C2] text-white text-sm font-semibold hover:bg-[#5a50a8] transition-colors cursor-pointer shadow-md shadow-[#6E62C2]/25 disabled:opacity-50 disabled:cursor-not-allowed",
  ],
  [
    "MyPageScreen.tsx:185",
    btn({ variant: "primary", pad: "3x1.5", text: "xs", radius: "xl", elevate: "brand", motion: "colors" }),
    "text-xs font-semibold text-white bg-[#6E62C2] px-3 py-1.5 rounded-xl hover:bg-[#5a50a8] transition-colors cursor-pointer shadow-md shadow-[#6E62C2]/25",
  ],
  [
    "ParseDemoScreen.tsx:275",
    btn({ variant: "primary", pad: "4x2", text: "xs", radius: "xl", elevate: "brand", motion: "colors" }),
    "text-xs font-semibold text-white bg-[#6E62C2] px-4 py-2 rounded-xl hover:bg-[#5a50a8] transition-colors cursor-pointer shadow-md shadow-[#6E62C2]/25",
  ],
  [
    "TaskForm.tsx:63",
    btn({ variant: "primary", pad: "4x1.5", text: "xs", radius: "xl", elevate: "sm", motion: "colors" }),
    "px-4 py-1.5 rounded-xl bg-[#6E62C2] text-white text-xs font-semibold hover:bg-[#5a50a8] transition-colors cursor-pointer shadow-sm",
  ],
  [
    "TasksScreen.tsx:65",
    btn({ variant: "primary", pad: "4x1.5", text: "xs", radius: "xl", elevate: "sm", motion: "colors" }, "ml-auto flex items-center gap-1.5"),
    "ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#6E62C2] text-white text-xs font-semibold hover:bg-[#5a50a8] transition-colors cursor-pointer shadow-sm",
  ],
  [
    "CashflowScreen.tsx:342",
    btn({ variant: "primary", pad: "3x1.5", text: "xs", radius: "lg", motion: "colors", off: "o40" }),
    "px-3 py-1.5 rounded-lg bg-[#6E62C2] text-white text-xs font-semibold hover:bg-[#5a50a8] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
  ],
  // 전환효과 없는 primary 2곳
  [
    "MiniForm.tsx:31",
    btn({ variant: "primary", pad: "3x1", text: "11", radius: "lg" }),
    "px-3 py-1 rounded-lg bg-[#6E62C2] text-white text-[11px] font-semibold hover:bg-[#5a50a8] cursor-pointer",
  ],
  [
    "CalendarScreen.tsx:179",
    btn({ variant: "primary", pad: "3x1.5", text: "11", radius: "xl" }),
    "px-3 py-1.5 rounded-xl bg-[#6E62C2] text-white text-[11px] font-semibold hover:bg-[#5a50a8] cursor-pointer",
  ],
  // DraftScreen.tsx:27-28 BTN + BTN_PRIMARY — 유일하게 테두리를 가진 primary
  [
    "DraftScreen.tsx:177 (BTN_PRIMARY)",
    btn({ variant: "primaryBordered", pad: "3x2", text: "xs", radius: "xl", motion: "colors", off: "o50" }),
    "px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-white bg-[#6E62C2] border-[#6E62C2] hover:bg-[#5a50a8]",
  ],
];

/* ───────────────────────── outline 10곳 ───────────────────────── */

const OUTLINE: Case[] = [
  [
    "CashflowScreen.tsx:347",
    btn({ variant: "outline", pad: "3x1.5", text: "xs", radius: "lg" }),
    "px-3 py-1.5 rounded-lg border border-[#E4E6EA] text-[#444444] text-xs font-semibold hover:bg-[#F5F6F8] cursor-pointer",
  ],
  [
    "MyPageScreen.tsx:353",
    btn({ variant: "outline", pad: "3x1.5", text: "xs", radius: "lg" }, "bg-white"),
    "px-3 py-1.5 rounded-lg bg-white border border-[#E4E6EA] text-[#444444] text-xs font-semibold hover:bg-[#F5F6F8] cursor-pointer",
  ],
  [
    "MiniForm.tsx:32",
    btn({ variant: "outline", pad: "3x1", text: "11", radius: "lg" }),
    "px-3 py-1 rounded-lg border border-[#E4E6EA] text-[#444444] text-[11px] font-semibold hover:bg-[#F5F6F8] cursor-pointer",
  ],
  [
    "CalendarScreen.tsx:96",
    btn({ variant: "outline", pad: "3x1.5", text: "xs", radius: "xl" }),
    "px-3 py-1.5 rounded-xl border border-[#E4E6EA] text-xs font-semibold text-[#444444] hover:bg-[#F5F6F8] cursor-pointer",
  ],
  [
    "AdminScreen.tsx:74",
    btn({ variant: "outline", pad: "3x1.5", text: "xs", radius: "xl" }),
    "text-xs font-semibold text-[#444444] border border-[#E4E6EA] px-3 py-1.5 rounded-xl hover:bg-[#F5F6F8] cursor-pointer",
  ],
  [
    "TaskForm.tsx:67",
    btn({ variant: "outline", pad: "4x1.5", text: "xs", radius: "xl", motion: "colors" }, "bg-white"),
    "px-4 py-1.5 rounded-xl bg-white border border-[#E4E6EA] text-[#444444] text-xs font-semibold hover:bg-[#F5F6F8] transition-colors cursor-pointer",
  ],
  [
    "InterviewScreen.tsx:219",
    btn({ variant: "outline", pad: "4x2", text: "xs", radius: "xl", block: true, off: "o40" }),
    "w-full px-4 py-2 rounded-xl border border-[#E4E6EA] text-[#444444] text-xs font-semibold hover:bg-[#F5F6F8] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
  ],
  [
    "OnboardingScreen.tsx:393",
    btn({ variant: "outline", pad: "4x2", text: "sm", radius: "xl" }),
    "px-4 py-2 rounded-xl border border-[#E4E6EA] text-[#444444] text-sm font-semibold hover:bg-[#F5F6F8] cursor-pointer",
  ],
  [
    "LoginScreen.tsx:88",
    btn({ variant: "outline", pad: "5x2.5", text: "xs", radius: "2xl", block: true }),
    "w-full px-5 py-2.5 rounded-2xl border border-[#E4E6EA] text-[#444444] text-xs font-semibold hover:bg-[#F5F6F8] cursor-pointer",
  ],
  // font-medium 은 cn()이 font-semibold를 눌러 주는 것에 의존한다(아래 별도 테스트).
  [
    "CashflowScreen.tsx:225",
    btn({ variant: "outline", pad: "4x2.5", text: "sm", radius: "xl", motion: "colors" }, "bg-white font-medium"),
    "px-4 py-2.5 rounded-xl text-sm font-medium text-[#444444] bg-white hover:bg-[#F5F6F8] border border-[#E4E6EA] transition-colors cursor-pointer",
  ],
];

/* ───────────────────────── soft 8곳 ───────────────────────── */

const SOFT: Case[] = [
  [
    "OnboardingScreen.tsx:183",
    btn({ variant: "soft", pad: "3x1.5", text: "xs", radius: "xl", motion: "colors" }),
    "text-xs font-semibold text-[#6E62C2] bg-[#f0eef9] border border-[#dddaf4] px-3 py-1.5 rounded-xl hover:bg-[#dddaf4] transition-colors cursor-pointer",
  ],
  [
    "MyPageScreen.tsx:175",
    btn({ variant: "soft", pad: "3x1.5", text: "xs", radius: "xl", motion: "colors" }),
    "text-xs font-semibold text-[#6E62C2] bg-[#f0eef9] border border-[#dddaf4] px-3 py-1.5 rounded-xl hover:bg-[#dddaf4] transition-colors cursor-pointer",
  ],
  [
    "MyPageScreen.tsx:278",
    btn({ variant: "soft", pad: "3x1.5", text: "xs", radius: "xl", motion: "colors", off: "o50" }),
    "text-xs font-semibold text-[#6E62C2] bg-[#f0eef9] border border-[#dddaf4] px-3 py-1.5 rounded-xl hover:bg-[#dddaf4] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
  ],
  [
    "AdminScreen.tsx:69",
    btn({ variant: "soft", pad: "3x1.5", text: "xs", radius: "xl", motion: "colors", off: "o50only" }),
    "text-xs font-semibold text-[#6E62C2] bg-[#f0eef9] border border-[#dddaf4] px-3 py-1.5 rounded-xl hover:bg-[#dddaf4] transition-colors cursor-pointer disabled:opacity-50",
  ],
  // 전환효과 없는 유일한 soft
  [
    "CashflowScreen.tsx:258",
    btn({ variant: "soft", pad: "3x1.5", text: "xs", radius: "lg" }),
    "text-xs font-semibold text-[#6E62C2] bg-[#f0eef9] border border-[#dddaf4] px-3 py-1.5 rounded-lg hover:bg-[#dddaf4] cursor-pointer",
  ],
  [
    "CashflowScreen.tsx:222",
    btn({ variant: "soft", pad: "4x2.5", text: "sm", radius: "xl", motion: "colors" }, "font-medium"),
    "px-4 py-2.5 rounded-xl text-sm font-medium text-[#6E62C2] bg-[#f0eef9] hover:bg-[#dddaf4] border border-[#dddaf4] transition-colors cursor-pointer",
  ],
  [
    "DraftScreen.tsx:182 (BTN_GHOST)",
    btn({ variant: "soft", pad: "3x2", text: "xs", radius: "xl", motion: "colors", off: "o50" }),
    "px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-[#6E62C2] bg-[#f0eef9] border-[#dddaf4] hover:bg-[#dddaf4]",
  ],
  [
    "DraftScreen.tsx:183 (BTN_GHOST)",
    btn({ variant: "soft", pad: "3x2", text: "xs", radius: "xl", motion: "colors", off: "o50" }),
    "px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-[#6E62C2] bg-[#f0eef9] border-[#dddaf4] hover:bg-[#dddaf4]",
  ],
];

/* ─────────────── muted / destructive / icon 12곳 ─────────────── */

const MUTED_DESTRUCTIVE: Case[] = [
  [
    "MyPageScreen.tsx:184",
    btn({ variant: "muted", pad: "3x1.5", text: "xs", radius: "xl", motion: "colors" }),
    "text-xs font-semibold text-[#888888] bg-[#F5F6F8] border border-[#E4E6EA] px-3 py-1.5 rounded-xl hover:bg-[#E4E6EA] transition-colors cursor-pointer",
  ],
  [
    "MyPageScreen.tsx:352",
    btn({ variant: "destructive", pad: "3x1.5", text: "xs", radius: "lg" }),
    "px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 cursor-pointer",
  ],
];

const ICON: Case[] = [
  [
    "CalendarScreen.tsx:100",
    btn({ variant: "iconNeutral", box: "8", radius: "xl", center: true }),
    "w-8 h-8 rounded-xl border border-[#E4E6EA] flex items-center justify-center text-[#444444] hover:bg-[#F5F6F8] cursor-pointer",
  ],
  [
    "CalendarScreen.tsx:101",
    btn({ variant: "iconNeutral", box: "8", radius: "xl", center: true }),
    "w-8 h-8 rounded-xl border border-[#E4E6EA] flex items-center justify-center text-[#444444] hover:bg-[#F5F6F8] cursor-pointer",
  ],
  // flex 없음 — UA 기본 text-align:center에 의존한다. center:false를 유지해야 한다.
  [
    "OnboardingScreen.tsx:282",
    btn({ variant: "iconNeutral", box: "10", radius: "xl" }),
    "w-10 h-10 rounded-xl border border-[#E4E6EA] text-[#444444] hover:bg-[#F5F6F8] cursor-pointer",
  ],
  [
    "OnboardingScreen.tsx:285",
    btn({ variant: "iconNeutral", box: "10", radius: "xl" }),
    "w-10 h-10 rounded-xl border border-[#E4E6EA] text-[#444444] hover:bg-[#F5F6F8] cursor-pointer",
  ],
  // 저장소에서 유일한 맨 `rounded`(4px). radius:"lg"로 새면 8px이 된다.
  [
    "CashflowScreen.tsx:291",
    btn({ variant: "iconNeutral", box: "6", text: "xs", radius: "DEFAULT" }),
    "w-6 h-6 rounded border border-[#E4E6EA] text-[#444444] text-xs hover:bg-[#F5F6F8] cursor-pointer",
  ],
  [
    "CashflowScreen.tsx:294",
    btn({ variant: "iconNeutral", box: "6", text: "xs", radius: "DEFAULT" }),
    "w-6 h-6 rounded border border-[#E4E6EA] text-[#444444] text-xs hover:bg-[#F5F6F8] cursor-pointer",
  ],
  [
    "CalendarScreen.tsx:208",
    btn({ variant: "iconMuted", box: "6", text: "10", radius: "lg", center: true }, "hover:text-[#6E62C2]"),
    "w-6 h-6 rounded-lg border border-[#E4E6EA] text-[#888888] hover:text-[#6E62C2] flex items-center justify-center text-[10px] cursor-pointer",
  ],
  [
    "CalendarScreen.tsx:209",
    btn({ variant: "iconMuted", box: "6", text: "10", radius: "lg", center: true }, "hover:text-rose-600"),
    "w-6 h-6 rounded-lg border border-[#E4E6EA] text-[#888888] hover:text-rose-600 flex items-center justify-center text-[10px] cursor-pointer",
  ],
  [
    "TasksScreen.tsx:111",
    btn({ variant: "iconMuted", box: "7", text: "xs", radius: "lg", center: true, motion: "colors" }, "bg-white hover:text-[#6E62C2] hover:border-[#6E62C2]/40"),
    "w-7 h-7 rounded-lg border border-[#E4E6EA] bg-white text-[#888888] hover:text-[#6E62C2] hover:border-[#6E62C2]/40 flex items-center justify-center text-xs transition-colors cursor-pointer",
  ],
  [
    "TasksScreen.tsx:114",
    btn({ variant: "iconMuted", box: "7", text: "xs", radius: "lg", center: true, motion: "colors" }, "bg-white hover:text-rose-600 hover:border-rose-200"),
    "w-7 h-7 rounded-lg border border-[#E4E6EA] bg-white text-[#888888] hover:text-rose-600 hover:border-rose-200 flex items-center justify-center text-xs transition-colors cursor-pointer",
  ],
];

/* ────────── ghostRow / menuItem / rowDisclosure 10곳 ────────── */

const ROWS: Case[] = [
  [
    "MyPageScreen.tsx:304",
    btn({ variant: "ghostRow", pad: "3x2.5", text: "sm", radius: "xl", block: true, motion: "colors" }),
    "w-full text-left text-sm px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-[#444444] hover:bg-[#F5F6F8]",
  ],
  [
    "MyPageScreen.tsx:333",
    btn({ variant: "ghostRow", pad: "3x2.5", text: "sm", radius: "xl", block: true, motion: "colors" }),
    "w-full text-left text-sm px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-[#444444] hover:bg-[#F5F6F8]",
  ],
  [
    "MyPageScreen.tsx:338",
    btn({ variant: "ghostRow", pad: "3x2.5", text: "sm", radius: "xl", block: true, motion: "colors" }),
    "w-full text-left text-sm px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-[#444444] hover:bg-[#F5F6F8]",
  ],
  [
    "MyPageScreen.tsx:344",
    btn({ variant: "ghostRowDanger", pad: "3x2.5", text: "sm", radius: "xl", block: true, motion: "colors" }),
    "w-full text-left text-sm px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-rose-600 hover:bg-rose-50",
  ],
  [
    "OnboardingScreen.tsx:190",
    btn({ variant: "menuItem", pad: "4x3", block: true, motion: "colors" }),
    "w-full text-left px-4 py-3 hover:bg-[#F5F6F8] transition-colors cursor-pointer border-b border-[#F5F6F8] last:border-0",
  ],
  [
    "MyPageScreen.tsx:311",
    btn({ variant: "menuItem", pad: "4x3", block: true, motion: "colors" }),
    "w-full text-left px-4 py-3 hover:bg-[#F5F6F8] transition-colors cursor-pointer border-b border-[#F5F6F8] last:border-0",
  ],
  [
    "DocumentsScreen.tsx:121",
    btn({ variant: "rowDisclosure", pad: "5x3.5", block: true, motion: "colors" }, "flex items-center justify-between"),
    "w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-[#F5F6F8]/60 transition-colors cursor-pointer",
  ],
  [
    "GrantsScreen.tsx:224",
    btn({ variant: "rowDisclosure", pad: "4x3", block: true, motion: "colors" }, "flex items-center gap-3"),
    "w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer hover:bg-[#F5F6F8]/60 transition-colors",
  ],
  // hover 배경이 다르다 — cn()이 hover:bg-[#F5F6F8]/60을 눌러 준다.
  [
    "GrantsScreen.tsx:147",
    btn({ variant: "rowDisclosure", pad: "4x3", block: true, motion: "colors" }, "grid grid-cols-3 items-center hover:bg-[#D8EAE0]/30"),
    "w-full grid grid-cols-3 px-4 py-3 items-center text-left cursor-pointer hover:bg-[#D8EAE0]/30 transition-colors",
  ],
  [
    "CalendarScreen.tsx:245",
    btn({ variant: "rowDisclosure", pad: "4x3", block: true, motion: "colors" }, "hover:bg-[#F5F6F8]"),
    "w-full text-left px-4 py-3 hover:bg-[#F5F6F8] transition-colors cursor-pointer",
  ],
];

/* ─────────── softInverse / successBanner / link 7곳 ─────────── */

const MISC: Case[] = [
  [
    "ConditionCoach.tsx:45",
    btn({ variant: "softInverse", pad: "3x2.5", radius: "xl", block: true, motion: "colors", off: "wait" }),
    "w-full text-left bg-white border border-[#dddaf4] rounded-xl px-3 py-2.5 hover:bg-[#f0eef9] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait",
  ],
  // `group`은 자손 span(GrantsScreen:128 group-hover:opacity-100)이 소비하므로 반드시 <button>에 남아야 한다.
  [
    "GrantsScreen.tsx:119",
    btn({ variant: "successBanner", pad: "4x3", radius: "xl", block: true, motion: "colors" }, "group"),
    "w-full bg-[#EEF4F0] border border-[#B2D1BF] rounded-xl px-4 py-3 text-left hover:bg-[#D8EAE0]/60 transition-colors cursor-pointer group",
  ],
  [
    "CashflowScreen.tsx:274",
    btn({ variant: "link", text: "11" }),
    "text-[11px] text-[#888888] hover:text-[#6E62C2] cursor-pointer",
  ],
  [
    "ConditionCoach.tsx:67",
    btn({ variant: "link", text: "10" }, "shrink-0"),
    "text-[10px] text-[#888888] hover:text-[#6E62C2] shrink-0 cursor-pointer",
  ],
  [
    "OnboardingScreen.tsx:304",
    btn({ variant: "link", text: "11" }, "underline"),
    "text-[11px] text-[#888888] hover:text-[#6E62C2] cursor-pointer underline",
  ],
  [
    "CashflowScreen.tsx:267",
    btn({ variant: "linkBrand", text: "xs" }),
    "text-xs font-semibold text-[#6E62C2] hover:underline cursor-pointer",
  ],
  [
    "InterviewScreen.tsx:160",
    btn({ variant: "linkDanger", text: "xs" }),
    "text-xs font-semibold text-rose-700 underline cursor-pointer",
  ],
];

/* ───────────────────────── chip 10곳 ───────────────────────── */

const CHIP_ON_SM = `${CHIP_BASE} bg-[#6E62C2] text-white border-[#6E62C2] shadow-sm`;
const CHIP_OFF_HOVER = `${CHIP_BASE} bg-white border-[#E4E6EA] text-[#444444] hover:border-[#6E62C2]/40`;
const CHIP_ON_PLAIN = `${CHIP_BASE} bg-[#6E62C2] text-white border-[#6E62C2]`;

const CHIPS: Case[] = [
  ["AnnouncementsScreen.tsx:104 (on)", ch({ on: true, elevate: "sm" }), CHIP_ON_SM],
  ["AnnouncementsScreen.tsx:104 (off)", ch({ on: false, elevate: "sm" }), CHIP_OFF_HOVER],
  ["DedupeDemoScreen.tsx:121 (on)", ch({ on: true, elevate: "sm" }), CHIP_ON_SM],
  ["DedupeDemoScreen.tsx:121 (off)", ch({ on: false, elevate: "sm" }), CHIP_OFF_HOVER],
  ["OnboardingScreen.tsx:254 (on)", ch({ on: true, elevate: "sm" }), CHIP_ON_SM],
  ["OnboardingScreen.tsx:254 (off)", ch({ on: false, elevate: "sm" }), CHIP_OFF_HOVER],
  ["OnboardingScreen.tsx:311 (on)", ch({ on: true }), CHIP_ON_PLAIN],
  ["OnboardingScreen.tsx:311 (off)", ch({ on: false }), CHIP_OFF_HOVER],
  ["OnboardingScreen.tsx:378 (on)", ch({ on: true }), CHIP_ON_PLAIN],
  ["OnboardingScreen.tsx:378 (off)", ch({ on: false }), CHIP_OFF_HOVER],
  // hover 테두리가 없는 2곳
  ["OnboardingScreen.tsx:331 (on)", ch({ on: true, hoverBorder: false }, "shrink-0"), `${CHIP_BASE} shrink-0 bg-[#6E62C2] text-white border-[#6E62C2]`],
  ["OnboardingScreen.tsx:331 (off)", ch({ on: false, hoverBorder: false }, "shrink-0"), `${CHIP_BASE} shrink-0 bg-white border-[#E4E6EA] text-[#444444]`],
  ["OnboardingScreen.tsx:343 (on)", ch({ on: true, hoverBorder: false }, "shrink-0"), `${CHIP_BASE} shrink-0 bg-[#6E62C2] text-white border-[#6E62C2]`],
  ["OnboardingScreen.tsx:343 (off)", ch({ on: false, hoverBorder: false }, "shrink-0"), `${CHIP_BASE} shrink-0 bg-white border-[#E4E6EA] text-[#444444]`],
  // 항상 OFF인 칩
  [
    "ParseDemoScreen.tsx:139",
    ch({ on: false }, "disabled:opacity-50"),
    "px-3 py-1.5 rounded-xl border border-[#E4E6EA] bg-white text-xs font-semibold text-[#444444] hover:border-[#6E62C2]/40 transition-all cursor-pointer disabled:opacity-50",
  ],
  [
    "TasksScreen.tsx:60 (on)",
    ch({ on: true, elevate: "brand" }),
    "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer bg-[#6E62C2] text-white border-[#6E62C2] shadow-md shadow-[#6E62C2]/25",
  ],
  [
    "TasksScreen.tsx:60 (off)",
    ch({ on: false, elevate: "brand" }),
    "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer bg-white border-[#E4E6EA] text-[#444444] hover:border-[#6E62C2]/40",
  ],
  [
    "SimulatorScreen.tsx:65 (on)",
    ch({ on: true, elevate: "brand" }),
    "text-xs px-3 py-1.5 rounded-xl border font-semibold transition-all cursor-pointer bg-[#6E62C2] text-white border-[#6E62C2] shadow-md shadow-[#6E62C2]/25",
  ],
  // OFF 배경만 다르다 — cn()이 bg-white를 bg-[#F5F6F8]로 갈아끼운다.
  [
    "SimulatorScreen.tsx:65 (off)",
    ch({ on: false, elevate: "brand" }, "bg-[#F5F6F8]"),
    "text-xs px-3 py-1.5 rounded-xl border font-semibold transition-all cursor-pointer border-[#E4E6EA] text-[#444444] hover:border-[#6E62C2]/40 bg-[#F5F6F8]",
  ],
];

/* ───────────────────────── segmented 4곳 ───────────────────────── */

const SEG_ON = "bg-white text-[#111111] shadow-sm border border-[#E4E6EA]";
const SEG_OFF = "text-[#888888] hover:text-[#444444]";

const SEGMENTS: Case[] = [
  ["AnnouncementsScreen.tsx:95 (on)", seg({ on: true, size: "sm" }), `px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${SEG_ON}`],
  ["AnnouncementsScreen.tsx:95 (off)", seg({ on: false, size: "sm" }), `px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${SEG_OFF}`],
  ["CashflowScreen.tsx:283 (on)", seg({ on: true, size: "sm", motion: "none" }), `px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${SEG_ON}`],
  ["CashflowScreen.tsx:283 (off)", seg({ on: false, size: "sm", motion: "none" }), `px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${SEG_OFF}`],
  ["DedupeDemoScreen.tsx:110 (on)", seg({ on: true, size: "md" }), `px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${SEG_ON}`],
  ["DedupeDemoScreen.tsx:110 (off)", seg({ on: false, size: "md" }), `px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${SEG_OFF}`],
  ["GrantsScreen.tsx:57 (on)", seg({ on: true, size: "md" }, "flex items-center gap-2"), `flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${SEG_ON}`],
  ["GrantsScreen.tsx:57 (off)", seg({ on: false, size: "md" }, "flex items-center gap-2"), `flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${SEG_OFF}`],
  // DraftScreen:186 — ON이 브랜드 채움이라 on 축을 쓰지 않고 색을 className으로 넘긴다.
  [
    "DraftScreen.tsx:186 (on)",
    seg({ on: null, size: "sm", motion: "none" }, "bg-[#6E62C2] text-white"),
    "px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer bg-[#6E62C2] text-white",
  ],
  [
    "DraftScreen.tsx:186 (off)",
    seg({ on: null, size: "sm", motion: "none" }, "text-[#888888] hover:text-[#444444]"),
    "px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer text-[#888888] hover:text-[#444444]",
  ],
];

/* ───────────────────────── selectCard 4곳 ───────────────────────── */

const CARD_ON = "border-[#6E62C2] bg-[#f0eef9] text-[#111111]"; // OnboardingScreen.tsx:21
const CARD_OFF = "text-[#444444]";

const CARDS: Case[] = [
  ["OnboardingScreen.tsx:221 (on)", card({ on: true }), `${SELECT_CARD_BASE} ${CARD_ON}`],
  ["OnboardingScreen.tsx:221 (off)", card({ on: false }), `${SELECT_CARD_BASE} ${CARD_OFF}`],
  ["OnboardingScreen.tsx:289 (on)", card({ on: true, block: true }), `${SELECT_CARD_BASE} w-full ${CARD_ON}`],
  ["OnboardingScreen.tsx:289 (off)", card({ on: false, block: true }), `${SELECT_CARD_BASE} w-full ${CARD_OFF}`],
  ["OnboardingScreen.tsx:349 (on)", card({ on: true, block: true }), `${SELECT_CARD_BASE} w-full ${CARD_ON}`],
  ["OnboardingScreen.tsx:349 (off)", card({ on: false, block: true }), `${SELECT_CARD_BASE} w-full ${CARD_OFF}`],
  ["OnboardingScreen.tsx:365 (on)", card({ on: true, block: true }), `${SELECT_CARD_BASE} w-full ${CARD_ON}`],
  ["OnboardingScreen.tsx:365 (off)", card({ on: false, block: true }), `${SELECT_CARD_BASE} w-full ${CARD_OFF}`],
];

/* ── <button>이 아닌 버튼 흉내 5곳 (Stage 3에서 button()을 직접 호출한다) ── */

const LOOKALIKES: Case[] = [
  [
    "CashflowScreen.tsx:218 <label>",
    btn({ variant: "primary", pad: "4x2.5", text: "sm", radius: "xl", elevate: "brand", motion: "colors" }),
    "px-4 py-2.5 rounded-xl bg-[#6E62C2] text-white text-sm font-semibold hover:bg-[#5a50a8] transition-colors cursor-pointer shadow-md shadow-[#6E62C2]/25",
  ],
  [
    "CashflowScreen.tsx:228 <a download>",
    btn({ variant: "outline", pad: "4x2.5", text: "sm", radius: "xl", motion: "colors" }, "bg-white font-medium"),
    "px-4 py-2.5 rounded-xl text-sm font-medium text-[#444444] bg-white hover:bg-[#F5F6F8] border border-[#E4E6EA] transition-colors cursor-pointer",
  ],
  [
    "MyPageScreen.tsx:171 <Link>",
    btn({ variant: "muted", pad: "3x1.5", text: "xs", radius: "xl", motion: "colors" }, "text-[#444444]"),
    "text-xs font-semibold text-[#444444] bg-[#F5F6F8] border border-[#E4E6EA] px-3 py-1.5 rounded-xl hover:bg-[#E4E6EA] transition-colors cursor-pointer",
  ],
];

/* ── 소스에 손 모양 커서가 없는 흉내 요소 11곳 (hand: false) ──────────────
   <Link>/<a>는 브라우저가 이미 같은 커서를 주므로 디자인 원본이 이 클래스를
   적어 두지 않았다. 표의 기본값을 그대로 쓰면 토큰이 하나 늘어난다.
   ───────────────────────────────────────────────────────────────────── */

const NO_HAND: Case[] = [
  [
    "DraftScreen.tsx:149 <Link>",
    btn({ variant: "linkBrand", text: "xs", hand: false }),
    "text-xs font-semibold text-[#6E62C2] hover:underline",
  ],
  [
    "DraftScreen.tsx:159 <Link>",
    btn({ variant: "linkBrand", text: "xs", hand: false }),
    "text-xs font-semibold text-[#6E62C2] hover:underline",
  ],
  [
    "DraftScreen.tsx:289 <Link>",
    btn({ variant: "linkBrandPlain", text: "11", hand: false }),
    "text-[11px] text-[#6E62C2] hover:underline",
  ],
  [
    "DocumentsScreen.tsx:47 <Link>",
    btn({ variant: "linkBrand", text: "xs", hand: false }),
    "text-xs font-semibold text-[#6E62C2] hover:underline",
  ],
  [
    "DocumentsScreen.tsx:63 <Link>",
    btn({ variant: "linkBrand", text: "xs", hand: false }),
    "text-xs font-semibold text-[#6E62C2] hover:underline",
  ],
  [
    "DocumentsScreen.tsx:82 <ExtLink>",
    btn({ variant: "softOnWhite", pad: "3x1.5", text: "xs", radius: "xl", motion: "colors", hand: false }, "shrink-0"),
    "shrink-0 text-xs font-semibold text-[#6E62C2] bg-white border border-[#dddaf4] px-3 py-1.5 rounded-xl hover:bg-[#f0eef9] transition-colors",
  ],
  [
    "OnboardingScreen.tsx:398 <Link>",
    btn({ variant: "link", text: "11", hand: false }, "hover:underline"),
    "text-[11px] text-[#888888] hover:text-[#6E62C2] hover:underline",
  ],
  [
    "LoginScreen.tsx:123 <Link>",
    btn({ variant: "soft", pad: "5x3", text: "sm", radius: "2xl", motion: "colors", block: true, hand: false }, "block text-center"),
    "block w-full text-center px-5 py-3 rounded-2xl bg-[#f0eef9] text-[#6E62C2] border border-[#dddaf4] text-sm font-semibold hover:bg-[#dddaf4] transition-colors",
  ],
  [
    "SignupScreen.tsx:58 <Link>",
    btn({ variant: "link", text: "11", hand: false }, "ml-auto font-semibold"),
    "ml-auto text-[11px] font-semibold text-[#888888] hover:text-[#6E62C2]",
  ],
  [
    "app/about/page.tsx:53 <Link>",
    btn({ variant: "soft", pad: "3x1.5", text: "xs", radius: "xl", motion: "colors", hand: false }, "ml-auto"),
    "ml-auto text-xs font-semibold text-[#6E62C2] bg-[#f0eef9] border border-[#dddaf4] px-3 py-1.5 rounded-xl hover:bg-[#dddaf4] transition-colors",
  ],
  [
    "app/about/page.tsx:88 <a>",
    btn({ variant: "soft", pad: "3x1.5", text: "11", radius: "lg", motion: "colors", hand: false }, "font-medium shrink-0"),
    "text-[11px] text-[#6E62C2] bg-[#f0eef9] border border-[#dddaf4] px-3 py-1.5 rounded-lg font-medium hover:bg-[#dddaf4] transition-colors shrink-0",
  ],
];

/* ───────────────────────── 실행 ───────────────────────── */

describe("button() — primary 20곳", () => it.each(PRIMARY)("%s", (...c) => check(c)));
describe("button() — outline 10곳", () => it.each(OUTLINE)("%s", (...c) => check(c)));
describe("button() — soft 8곳", () => it.each(SOFT)("%s", (...c) => check(c)));
describe("button() — muted/destructive 2곳", () => it.each(MUTED_DESTRUCTIVE)("%s", (...c) => check(c)));
describe("button() — icon 10곳", () => it.each(ICON)("%s", (...c) => check(c)));
describe("button() — ghostRow/menuItem/rowDisclosure 10곳", () => it.each(ROWS)("%s", (...c) => check(c)));
describe("button() — softInverse/successBanner/link 7곳", () => it.each(MISC)("%s", (...c) => check(c)));
describe("chip() — 10곳", () => it.each(CHIPS)("%s", (...c) => check(c)));
describe("segmented() — 5곳(트레이 탭 4 + Draft:186 oddball)", () => it.each(SEGMENTS)("%s", (...c) => check(c)));
describe("selectCard() — 4곳", () => it.each(CARDS)("%s", (...c) => check(c)));
describe("버튼 흉내 요소 (asChild 없이 button()만 사용)", () => it.each(LOOKALIKES)("%s", (...c) => check(c)));
describe("손 모양 커서가 없는 흉내 요소 11곳 (hand: false)", () => it.each(NO_HAND)("%s", (...c) => check(c)));

/* ───────────── cn() 관련 회귀 방지 ───────────── */

describe("cn() 병합 안전성", () => {
  it("`shadow-md shadow-[#6E62C2]/25`를 평탄화하지 않는다 (primary 13곳)", () => {
    expect(cn(BRAND_SHADOW)).toBe("shadow-md shadow-[#6E62C2]/25");
    expect(cn("shadow-md shadow-[#6E62C2]/25")).toBe("shadow-md shadow-[#6E62C2]/25");
  });

  it("<Button>의 cn(button(...), className) 경로에서도 브랜드 그림자가 남는다", () => {
    const merged = cn(
      button({ variant: "primary", pad: "5x2", text: "sm", radius: "xl", elevate: "brand", motion: "colors" }),
      "flex items-center gap-2",
    );
    expect(tokens(merged)).toContain("shadow-md");
    expect(tokens(merged)).toContain("shadow-[#6E62C2]/25");
  });

  it("`rounded`(4px)가 뒤따르는 rounded-lg에 먹히지 않는다 — CashflowScreen:291/294", () => {
    expect(tokens(btn({ variant: "iconNeutral", box: "6", text: "xs", radius: "DEFAULT" }))).toContain("rounded");
    // 축이 값 하나만 내보내므로 rounded-lg가 함께 나올 일이 없다
    expect(tokens(btn({ variant: "iconNeutral", box: "6", text: "xs", radius: "DEFAULT" }))).not.toContain("rounded-lg");
  });

  it("className의 font-medium이 variant의 font-semibold를 이긴다", () => {
    const merged = btn({ variant: "outline", pad: "4x2.5", text: "sm", radius: "xl", motion: "colors" }, "font-medium");
    expect(tokens(merged)).toContain("font-medium");
    expect(tokens(merged)).not.toContain("font-semibold");
  });

  it("selectCard는 cn()에 통과시키지 않는다 — border-[#E4E6EA]가 사라진다", () => {
    const raw = selectCard({ on: true });
    expect(tokens(raw)).toContain("border-[#E4E6EA]");
    expect(tokens(cn(raw))).not.toContain("border-[#E4E6EA]");
  });
});

describe("테이블 불변식", () => {
  it("hand를 넘기지 않으면 예전 base와 똑같은 한 클래스만 나온다 (<button> 356곳 고정)", () => {
    expect(BUTTON_BASE).toBe("cursor-pointer");
    // 기존 호출부는 전부 이 형태다 — hand 축이 생겨도 출력이 달라지면 안 된다.
    expect(button({})).toBe("cursor-pointer");
    expect(tokens(btn({ variant: "linkBrand", text: "xs" }))).toContain(BUTTON_BASE);
  });

  it("hand: false면 그 클래스만 빠지고 나머지는 그대로다", () => {
    expect(button({ hand: false })).toBe("");
    const on = tokens(btn({ variant: "linkBrand", text: "xs" }));
    const off = tokens(btn({ variant: "linkBrand", text: "xs", hand: false }));
    expect(off).toEqual(on.filter((t) => t !== BUTTON_BASE));
  });

  it("흉내 요소 11곳은 손 모양 커서 클래스를 하나도 내보내지 않는다", () => {
    for (const [site, actual] of NO_HAND) expect([site, tokens(actual)]).toEqual([site, expect.not.arrayContaining([BUTTON_BASE])]);
  });

  it("chip의 그림자는 ON에서만, hover 테두리는 OFF에서만 붙는다", () => {
    expect(tokens(chip({ on: false, elevate: "sm" }))).not.toContain("shadow-sm");
    expect(tokens(chip({ on: false, elevate: "brand" }))).not.toContain("shadow-md");
    expect(tokens(chip({ on: true }))).not.toContain("hover:border-[#6E62C2]/40");
    expect(tokens(chip({ on: true, elevate: "sm" }))).toContain("shadow-sm");
    expect(tokens(chip({ on: false }))).toContain("hover:border-[#6E62C2]/40");
  });

  it("shadcn stock base의 위험 클래스를 하나도 내보내지 않는다", () => {
    const banned = [
      "disabled:pointer-events-none",
      "whitespace-nowrap",
      "rounded-md",
      "focus-visible:ring-2",
      "focus-visible:ring-ring",
      "focus-visible:ring-offset-2",
      "focus-visible:outline-none",
      "inline-flex",
    ];
    const everything = [
      ...PRIMARY, ...OUTLINE, ...SOFT, ...MUTED_DESTRUCTIVE, ...ICON,
      ...ROWS, ...MISC, ...CHIPS, ...SEGMENTS, ...CARDS, ...LOOKALIKES, ...NO_HAND,
    ].flatMap(([, actual]) => tokens(actual));
    for (const b of banned) expect(everything).not.toContain(b);
  });
});
