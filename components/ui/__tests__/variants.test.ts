// variants.ts가 실소스 문자열을 그대로 재현하는지 검증한다(JSX 없음 · node 환경).
// 비교는 "정렬된 클래스 토큰 집합"이다 — cva는 base→variant 순으로 붙이므로
// 텍스트 순서는 소스와 달라질 수 있지만 캐스케이드는 스타일시트 순서로 정해져 렌더가 같다.
// cn()은 컴포넌트가 실제로 거치는 경로라 테스트도 똑같이 통과시킨다(twMerge가 지우는 게 없는지 확인).

import { describe, expect, it } from "vitest";

import {
  alertVariants,
  annStatusBadge,
  badgeVariants,
  cardContentVariants,
  cardHeaderVariants,
  cardMutedVariants,
  cardTitleClass,
  cardVariants,
  chipVariants,
  dedupeStatusBadge,
  grantStatusBadge,
  leadTimeBadge,
  progressIndicatorClass,
  progressTrackClass,
  separatorVerticalClass,
  skeletonCardClass,
  statTileVariants,
  tableBodyClass,
  tableCellClass,
  tableClass,
  tableContainerClass,
  tableHeadClass,
  tableHeaderClass,
  tableRowClass,
} from "@/components/ui/variants";
import { cn } from "@/lib/utils";

/** 클래스 문자열을 정렬된 토큰 집합으로 정규화한다. */
function tokens(s: string): string[] {
  return [...new Set(s.split(/\s+/).filter(Boolean))].sort();
}

/** 합성 결과가 소스 문자열과 같은 토큰 집합인지 확인한다. */
function expectSame(actual: string, source: string) {
  expect(tokens(actual)).toEqual(tokens(source));
}

describe("badgeVariants — 소스 문자열 재현", () => {
  it("lg 판정 배지 (GrantsScreen.tsx:92 · :226 · AnnouncementsScreen.tsx:141)", () => {
    expectSame(
      cn(badgeVariants({ size: "lg", weight: "semibold", tone: "success", fixed: "shrink0" })),
      "text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0 bg-[#EEF4F0] text-[#2A5A46] border-[#B2D1BF]",
    );
  });

  it("lg + inline-block (ParseDemoScreen.tsx:282 · DedupeDemoScreen.tsx:197)", () => {
    expectSame(
      cn(badgeVariants({ size: "lg", weight: "semibold", tone: "dangerSoft", fixed: "inlineBlock" })),
      "inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full border bg-rose-50 text-rose-600 border-rose-200",
    );
  });

  it("md 업무유형 배지 (TasksScreen.tsx:95 · GrantsScreen.tsx:290)", () => {
    expectSame(
      cn(badgeVariants({ size: "md", tone: "info" })),
      "text-[10px] px-2 py-0.5 rounded-full border font-medium text-blue-700 border-blue-200 bg-blue-50",
    );
    expectSame(
      cn(badgeVariants({ size: "md", tone: "purple" })),
      "text-[10px] px-2 py-0.5 rounded-full border font-medium text-purple-700 border-purple-200 bg-purple-50",
    );
  });

  it("xs 캘린더 배지 (CalendarScreen.tsx:213 · :216)", () => {
    expectSame(
      cn(badgeVariants({ size: "xs", tone: "success" })),
      "text-[9px] px-1.5 py-0.5 rounded-full border font-medium bg-[#EEF4F0] text-[#2A5A46] border-[#B2D1BF]",
    );
    expectSame(
      cn(badgeVariants({ size: "xs", tone: "muted" })),
      "text-[9px] px-1.5 py-0.5 rounded-full border font-medium bg-[#F5F6F8] text-[#888888] border-[#E4E6EA]",
    );
    expectSame(
      cn(badgeVariants({ size: "xs", tone: "purple" })),
      "text-[9px] px-1.5 py-0.5 rounded-full border font-medium text-purple-700 border-purple-200 bg-purple-50",
    );
  });

  it("sm 코치 배지 (ConditionCoach.tsx:75)", () => {
    expectSame(
      cn(badgeVariants({ size: "sm", tone: "success" })),
      "text-[10px] px-1.5 py-0.5 rounded-full border font-medium bg-[#EEF4F0] text-[#2A5A46] border-[#B2D1BF]",
    );
  });

  it("cell 표 안 상태 배지 (DocumentsScreen.tsx:110)", () => {
    expectSame(
      cn(badgeVariants({ size: "cell", weight: "semibold", tone: "warning" })),
      "text-[10px] font-semibold px-2 py-1 rounded-full border w-fit bg-amber-50 text-amber-700 border-amber-200",
    );
  });

  it("count 섹션 카운터 — 두 초록이 서로 다르다 (GrantsScreen.tsx:74 · :219)", () => {
    expectSame(
      cn(badgeVariants({ size: "count", weight: "mono", tone: "successAlt" })),
      "text-xs font-mono text-[#3D7260] bg-[#EEF4F0] border border-[#B2D1BF] px-2 py-0.5 rounded-full",
    );
    expectSame(
      cn(badgeVariants({ size: "count", weight: "mono", tone: "muted" })),
      "text-xs font-mono text-[#888888] bg-[#F5F6F8] border border-[#E4E6EA] px-2 py-0.5 rounded-full",
    );
  });

  it("due 마감 배지 (DocumentsScreen.tsx:69-72)", () => {
    expectSame(
      cn(badgeVariants({ size: "due", weight: "monoSemibold", tone: "muted", fixed: "shrink0" })),
      "shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border font-mono bg-[#F5F6F8] text-[#888888] border-[#E4E6EA]",
    );
    expectSame(
      cn(badgeVariants({ size: "due", weight: "monoSemibold", tone: "danger", fixed: "shrink0" })),
      "shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border font-mono bg-rose-50 text-rose-700 border-rose-200",
    );
  });

  it("brand 배지 — 같은 크기에서 폰트만 4가지 (weight 축이 필요한 이유)", () => {
    // ParseDemoScreen.tsx:210 · :219
    expectSame(
      cn(badgeVariants({ size: "md", weight: "mono", tone: "brand" })),
      "text-[10px] font-mono text-[#6E62C2] bg-[#f0eef9] border border-[#dddaf4] px-2 py-0.5 rounded-full",
    );
    // GrantsScreen.tsx:101
    expectSame(
      cn(badgeVariants({ size: "md", weight: "medium", tone: "brand" })),
      "text-[10px] font-medium text-[#6E62C2] bg-[#f0eef9] border border-[#dddaf4] px-2 py-0.5 rounded-full",
    );
    // DedupeDemoScreen.tsx:42
    expectSame(
      cn(badgeVariants({ size: "md", weight: "semibold", tone: "brand" })),
      "text-[10px] font-semibold text-[#6E62C2] bg-[#f0eef9] border border-[#dddaf4] px-2 py-0.5 rounded-full",
    );
    // DraftScreen.tsx:251 — 폰트 유틸 자체가 없다
    expectSame(
      cn(badgeVariants({ size: "md", weight: "none", tone: "brand" })),
      "text-[10px] text-[#6E62C2] bg-[#f0eef9] border border-[#dddaf4] px-2 py-0.5 rounded-full",
    );
    // DraftScreen.tsx:234
    expectSame(
      cn(badgeVariants({ size: "md11", weight: "mono", tone: "brand", fixed: "shrink0" })),
      "text-[11px] font-mono text-[#6E62C2] bg-[#f0eef9] border border-[#dddaf4] px-2 py-0.5 rounded-full shrink-0",
    );
  });

  it("무테 BETA 칩 (Sidebar.tsx:68 · LoginScreen.tsx:63 · Sidebar.tsx:82)", () => {
    expectSame(
      cn(badgeVariants({ size: "xs", weight: "monoSemibold", bordered: false, tone: "brandPlain" }), "ml-auto"),
      "ml-auto text-[9px] font-mono text-[#6E62C2] bg-[#f0eef9] px-1.5 py-0.5 rounded-full font-semibold",
    );
    expectSame(
      cn(badgeVariants({ size: "xs", weight: "semibold", bordered: false, tone: "brandPlain" })),
      "text-[9px] text-[#6E62C2] bg-[#f0eef9] px-1.5 py-0.5 rounded-full font-semibold",
    );
  });

  it("사이드바 카운트 칩 (Sidebar.tsx:111) — 색이 활성 상태에 달려 있어 tone={null}", () => {
    expectSame(
      cn(badgeVariants({ size: "sm", weight: "monoSemibold", bordered: false, tone: null }), "bg-white/20 text-white"),
      "text-[10px] font-mono px-1.5 py-0.5 rounded-full font-semibold bg-white/20 text-white",
    );
    expectSame(
      cn(badgeVariants({ size: "sm", weight: "monoSemibold", bordered: false, tone: null }), "bg-[#E4E6EA] text-[#444444]"),
      "text-[10px] font-mono px-1.5 py-0.5 rounded-full font-semibold bg-[#E4E6EA] text-[#444444]",
    );
  });

  it("폰트 유틸이 없는 완료 배지 (AdminScreen.tsx:198)", () => {
    expectSame(
      cn(badgeVariants({ size: "sm", weight: "none", tone: "success" })),
      "text-[#2A5A46] bg-[#EEF4F0] border border-[#B2D1BF] px-1.5 py-0.5 rounded-full text-[10px]",
    );
  });

  it("대상 배지 (AnnouncementsScreen.tsx:150)", () => {
    expectSame(
      cn(badgeVariants({ size: "sm", weight: "semibold", tone: "success" })),
      "text-[10px] font-semibold text-[#2A5A46] bg-[#EEF4F0] border border-[#B2D1BF] px-1.5 py-0.5 rounded-full",
    );
  });
});

describe("상태 맵 별칭 — 기존 4개 맵과 바이트 단위로 같은 출력", () => {
  // GrantsScreen.tsx:20-24
  const statusStyle = {
    pass: "bg-[#EEF4F0] text-[#2A5A46] border-[#B2D1BF]",
    fail: "bg-rose-50 text-rose-600 border-rose-200",
    conditional: "bg-amber-50 text-amber-700 border-amber-200",
  } as const;

  // AnnouncementsScreen.tsx:15-19
  const annStatusStyle = {
    open: "bg-blue-50 text-blue-700 border-blue-200",
    closing: "bg-rose-50 text-rose-700 border-rose-200",
    closed: "bg-[#F5F6F8] text-[#888888] border-[#E4E6EA]",
  } as const;

  // DedupeDemoScreen.tsx:25-29
  const DECISION = {
    duplicate: "bg-[#EEF4F0] text-[#2A5A46] border-[#B2D1BF]",
    review: "bg-amber-50 text-amber-700 border-amber-200",
    distinct: "bg-[#F5F6F8] text-[#888888] border-[#E4E6EA]",
  } as const;

  // DocumentsScreen.tsx:18-23
  const STATUS = {
    ok: "bg-[#EEF4F0] text-[#2A5A46] border-[#B2D1BF]",
    tight: "bg-amber-50 text-amber-700 border-amber-200",
    late: "bg-rose-50 text-rose-700 border-rose-200",
    unknown: "bg-[#F5F6F8] text-[#888888] border-[#E4E6EA]",
  } as const;

  // 맵 자리에서만 쓰이던 tone 문자열을, 소스가 쓰던 base와 붙여 통째로 비교한다.
  const LG_BASE = "text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0";

  it("grantStatusBadge === GrantsScreen statusStyle", () => {
    for (const k of ["pass", "fail", "conditional"] as const) {
      expectSame(
        cn(badgeVariants({ size: "lg", weight: "semibold", tone: grantStatusBadge[k], fixed: "shrink0" })),
        `${LG_BASE} ${statusStyle[k]}`,
      );
    }
  });

  it("annStatusBadge === AnnouncementsScreen annStatusStyle", () => {
    for (const k of ["open", "closing", "closed"] as const) {
      expectSame(
        cn(badgeVariants({ size: "lg", weight: "semibold", tone: annStatusBadge[k], fixed: "shrink0" })),
        `${LG_BASE} ${annStatusStyle[k]}`,
      );
    }
  });

  it("dedupeStatusBadge === DedupeDemoScreen DECISION.cls", () => {
    for (const k of ["duplicate", "review", "distinct"] as const) {
      expectSame(
        cn(badgeVariants({ size: "lg", weight: "semibold", tone: dedupeStatusBadge[k], fixed: "inlineBlock" })),
        `inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full border ${DECISION[k]}`,
      );
    }
  });

  it("leadTimeBadge === DocumentsScreen STATUS.cls", () => {
    for (const k of ["ok", "tight", "late", "unknown"] as const) {
      expectSame(
        cn(badgeVariants({ size: "cell", weight: "semibold", tone: leadTimeBadge[k] })),
        `text-[10px] font-semibold px-2 py-1 rounded-full border w-fit ${STATUS[k]}`,
      );
    }
  });

  it("rose-600과 rose-700은 서로 다른 키다 — 합치면 5곳이 다시 칠해진다", () => {
    expect(grantStatusBadge.fail).toBe("dangerSoft");
    expect(annStatusBadge.closing).toBe("danger");
    expect(leadTimeBadge.late).toBe("danger");
    expect(cn(badgeVariants({ tone: "dangerSoft" }))).toContain("text-rose-600");
    expect(cn(badgeVariants({ tone: "danger" }))).toContain("text-rose-700");
    expect(cn(badgeVariants({ tone: "dangerSoft" }))).not.toContain("text-rose-700");
  });

  it("#2A5A46과 #3D7260도 서로 다른 키다", () => {
    expect(cn(badgeVariants({ tone: "success" }))).toContain("text-[#2A5A46]");
    expect(cn(badgeVariants({ tone: "successAlt" }))).toContain("text-[#3D7260]");
    expect(cn(badgeVariants({ tone: "success" }))).not.toContain("#3D7260");
  });
});

describe("chipVariants — rounded-lg 칩", () => {
  it("danger (TasksScreen.tsx:108 · GrantsScreen.tsx:300)", () => {
    expectSame(
      cn(chipVariants({ tone: "danger" })),
      "text-rose-600 text-[11px] bg-rose-50 border border-rose-200 rounded-lg px-2 py-1 font-medium",
    );
  });
  it("warning (GrantsScreen.tsx:302)", () => {
    expectSame(
      cn(chipVariants({ tone: "warning" })),
      "text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-2 py-1 font-medium",
    );
  });
});

describe("cardVariants — 흰 카드 셸", () => {
  it("기본 + 그림자 (about/page.tsx:63 · MyPageScreen.tsx:237 …9곳)", () => {
    expectSame(cn(cardVariants()), "bg-white border border-[#E4E6EA] rounded-2xl shadow-sm");
  });
  it("+ overflow-hidden (CalendarScreen.tsx:233 …5곳, CalendarScreen.tsx:173은 어순만 다름)", () => {
    expectSame(
      cn(cardVariants({ clip: true })),
      "bg-white border border-[#E4E6EA] rounded-2xl shadow-sm overflow-hidden",
    );
    expectSame(
      cn(cardVariants({ clip: true })),
      "bg-white border border-[#E4E6EA] rounded-2xl overflow-hidden shadow-sm",
    );
  });
  it("p-5 자기패딩, 그림자 없음 (AdminScreen.tsx:31 · CashflowScreen.tsx:380 · DraftScreen.tsx:285)", () => {
    expectSame(cn(cardVariants({ pad: "p5", shadow: "none" })), "bg-white border border-[#E4E6EA] rounded-2xl p-5");
  });
  it("p-5 + 레이아웃 extras는 className으로 (CashflowScreen.tsx:216 · AdminScreen.tsx:107)", () => {
    expectSame(
      cn(cardVariants({ pad: "p5", shadow: "none" }), "space-y-4"),
      "bg-white border border-[#E4E6EA] rounded-2xl p-5 space-y-4",
    );
    expectSame(
      cn(cardVariants({ pad: "p5", shadow: "none" }), "mt-3"),
      "bg-white border border-[#E4E6EA] rounded-2xl p-5 mt-3",
    );
  });
  it("p-6 + 그림자 (SimulatorScreen.tsx:41 · DedupeDemoScreen.tsx:177 — 어순만 다르다)", () => {
    expectSame(cn(cardVariants({ pad: "p6" })), "bg-white border border-[#E4E6EA] rounded-2xl p-6 shadow-sm");
    expectSame(cn(cardVariants({ pad: "p6" })), "bg-white border border-[#E4E6EA] rounded-2xl shadow-sm p-6");
  });
  it("표 래퍼 — 그림자 없이 clip (AdminScreen.tsx:157 · :183 · DraftScreen.tsx:222)", () => {
    expectSame(
      cn(cardVariants({ shadow: "none", clip: true })),
      "bg-white border border-[#E4E6EA] rounded-2xl overflow-hidden",
    );
  });
  it("인증 셸 rounded-3xl (LoginScreen.tsx:59 · SignupScreen.tsx:54)", () => {
    expectSame(
      cn(cardVariants({ radius: "3xl", clip: true }), "w-full max-w-md"),
      "w-full max-w-md bg-white border border-[#E4E6EA] rounded-3xl shadow-sm overflow-hidden",
    );
  });
  // §4.1.2에서 이 호출부(OnboardingScreen.tsx:188)는 DropdownMenu로 옮겨 현재 0곳이다.
  // shadow:"lg" 멤버 자체는 남겨 두고, 재현 능력만 계속 고정해 둔다.
  it("shadow-lg 드롭다운 — 옛 OnboardingScreen.tsx:188 형태", () => {
    expectSame(
      cn(cardVariants({ shadow: "lg", clip: true }), "absolute right-0 mt-1 w-72 z-10"),
      "absolute right-0 mt-1 w-72 bg-white border border-[#E4E6EA] rounded-2xl shadow-lg z-10 overflow-hidden",
    );
  });
});

describe("cardMutedVariants — #F5F6F8 카드", () => {
  it("p-5 (DashboardScreen.tsx:72 · :95 · :120)", () => {
    expectSame(cn(cardMutedVariants()), "bg-[#F5F6F8] rounded-2xl p-5");
  });
  it("빈 상태 p-10 (AnnouncementsScreen.tsx:135 · DocumentsScreen.tsx:48 · DraftScreen.tsx:150 · TasksScreen.tsx:125)", () => {
    expectSame(cn(cardMutedVariants({ pad: "p10", center: true })), "bg-[#F5F6F8] rounded-2xl p-10 text-center");
  });
  it("빈 상태 p-8 (DocumentsScreen.tsx:90 · ExpiringScreen.tsx:36)", () => {
    expectSame(cn(cardMutedVariants({ pad: "p8", center: true })), "bg-[#F5F6F8] rounded-2xl p-8 text-center");
  });
  it("테두리 있는 형제 (SimulatorScreen.tsx:113 · DraftScreen.tsx:170 · CalendarScreen.tsx:227)", () => {
    expectSame(
      cn(cardMutedVariants({ bordered: true, pad: "p8", center: true })),
      "bg-[#F5F6F8] border border-[#E4E6EA] rounded-2xl p-8 text-center",
    );
    expectSame(
      cn(cardMutedVariants({ bordered: true, pad: "px5y4" }), "space-y-3"),
      "bg-[#F5F6F8] border border-[#E4E6EA] rounded-2xl px-5 py-4 space-y-3",
    );
    expectSame(
      cn(cardMutedVariants({ bordered: true, pad: "px4y4" })),
      "bg-[#F5F6F8] border border-[#E4E6EA] rounded-2xl px-4 py-4",
    );
  });
});

describe("cardHeaderVariants / cardContentVariants / cardTitleClass", () => {
  it("기본 헤더 7곳 (about/page.tsx:64 · MyPageScreen.tsx:238 …)", () => {
    expectSame(cn(cardHeaderVariants()), "px-5 py-4 border-b border-[#E4E6EA]");
  });
  it("between 헤더 — 어순이 달라도 같은 집합 (MyPageScreen.tsx:276 vs :159)", () => {
    expectSame(cn(cardHeaderVariants({ layout: "between" })), "px-5 py-4 border-b border-[#E4E6EA] flex items-center justify-between");
    expectSame(cn(cardHeaderVariants({ layout: "between" })), "flex items-center justify-between px-5 py-4 border-b border-[#E4E6EA]");
  });
  it("row 헤더 (ParseDemoScreen.tsx:208)", () => {
    expectSame(cn(cardHeaderVariants({ layout: "row" })), "px-5 py-4 border-b border-[#E4E6EA] flex items-center gap-2");
  });
  it("compact 헤더 (CalendarScreen.tsx:186 · :234 · :174)", () => {
    expectSame(cn(cardHeaderVariants({ size: "compact" })), "px-4 py-3 border-b border-[#E4E6EA]");
    expectSame(
      cn(cardHeaderVariants({ size: "compact", layout: "between" })),
      "px-4 py-3 border-b border-[#E4E6EA] flex items-center justify-between",
    );
  });
  it("tight 헤더 (DraftScreen.tsx:223)", () => {
    expectSame(cn(cardHeaderVariants({ size: "tight", layout: "row" })), "px-5 py-3 border-b border-[#E4E6EA] flex items-center gap-2");
  });
  it("auth 헤더 (LoginScreen.tsx:60 · SignupScreen.tsx:55)", () => {
    expectSame(cn(cardHeaderVariants({ size: "auth" })), "px-7 pt-7 pb-5 border-b border-[#E4E6EA]");
  });
  it("chat 헤더 (InterviewScreen.tsx:119) — 행 간격이 layout row와 달라 className으로 넘긴다", () => {
    expectSame(
      cn(cardHeaderVariants({ size: "chat" }), "flex items-center gap-2.5"),
      "px-6 pt-6 pb-4 border-b border-[#E4E6EA] flex items-center gap-2.5",
    );
    // layout: "row"를 쓰면 간격이 좁아진다 — 픽셀이 바뀐다.
    expect(cn(cardHeaderVariants({ size: "chat", layout: "row" }))).toContain("gap-2");
    expect(cn(cardHeaderVariants({ size: "chat", layout: "row" }))).not.toContain("gap-2.5");
  });
  it("본문 (about/page.tsx:67 · ParseDemoScreen.tsx:189 · MyPageScreen.tsx:302)", () => {
    expectSame(cn(cardContentVariants(), "space-y-3"), "px-5 py-4 space-y-3");
    expectSame(cn(cardContentVariants(), "grid grid-cols-3 gap-3"), "px-5 py-4 grid grid-cols-3 gap-3");
    expectSame(cn(cardContentVariants({ size: "tight" }), "space-y-1"), "px-5 py-3 space-y-1");
  });
  it("divide-y 리스트 본문 (about/page.tsx:81 · CalendarScreen.tsx:191 · MyPageScreen.tsx:281 …9곳)", () => {
    expectSame(cn(cardContentVariants({ size: "none", list: true })), "divide-y divide-[#F5F6F8]");
    expectSame(
      cn(cardContentVariants({ size: "none", list: true }), "max-h-64 overflow-y-auto"),
      "divide-y divide-[#F5F6F8] max-h-64 overflow-y-auto",
    );
  });
  it("cardTitleClass (about/page.tsx:65 …20곳)", () => {
    expect(cardTitleClass).toBe("text-[#111111] font-semibold text-sm");
  });
});

describe("alertVariants — 인라인 알림 박스", () => {
  it("danger · xl · md 4곳 (CashflowScreen.tsx:437 · LoginScreen.tsx:111 · SignupScreen.tsx:97 · InterviewScreen.tsx:158)", () => {
    expectSame(cn(alertVariants()), "bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5");
    expectSame(
      cn(alertVariants(), "flex items-center justify-between gap-3"),
      "bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3",
    );
  });
  it("danger · xl · lg (DraftScreen.tsx:203 · MyPageScreen.tsx:349)", () => {
    expectSame(cn(alertVariants({ pad: "lg" })), "bg-rose-50 border border-rose-200 rounded-xl px-4 py-3");
    expectSame(cn(alertVariants({ pad: "lg" }), "space-y-2"), "bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 space-y-2");
  });
  it("danger · 2xl (DedupeDemoScreen.tsx:171 · ParseDemoScreen.tsx:177 · AdminScreen.tsx:81 · :87)", () => {
    expectSame(cn(alertVariants({ radius: "2xl", pad: "lg" })), "bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3");
    expectSame(cn(alertVariants({ radius: "2xl", pad: "p6" })), "bg-rose-50 border border-rose-200 rounded-2xl p-6");
  });
  it("danger · xl · xs (ConditionCoach.tsx:58)", () => {
    expectSame(cn(alertVariants({ pad: "xs" }), "mt-2"), "mt-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2");
  });
  it("xl · xsTall — 판정 상세 안쪽 두 박스 (GrantsScreen.tsx:238 · :243)", () => {
    expectSame(cn(alertVariants({ tone: "warning", pad: "xsTall" })), "bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5");
    expectSame(cn(alertVariants({ pad: "xsTall" })), "bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5");
  });
  it("danger · 2xl · p5 (SimulatorScreen.tsx:94)", () => {
    expectSame(cn(alertVariants({ radius: "2xl", pad: "p5" })), "bg-rose-50 border border-rose-200 rounded-2xl p-5");
  });
  it("warning 쌍둥이 (LoginScreen.tsx:71 · SignupScreen.tsx:66)", () => {
    expectSame(cn(alertVariants({ tone: "warning", pad: "lg" })), "bg-amber-50 border border-amber-200 rounded-xl px-4 py-3");
  });
  it("warning 나머지 (DraftScreen.tsx:305 · SimulatorScreen.tsx:76 · MyPageScreen.tsx:230 · ParseDemoScreen.tsx:232)", () => {
    expectSame(cn(alertVariants({ tone: "warning", radius: "2xl", pad: "p5" })), "bg-amber-50 border border-amber-200 rounded-2xl p-5");
    expectSame(
      cn(alertVariants({ tone: "warning", pad: "sm" }), "mx-5 mb-4"),
      "mx-5 mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2",
    );
    expectSame(cn(alertVariants({ tone: "warning", radius: "2xl", pad: "x2" })), "bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4");
  });
  it("success (MyPageScreen.tsx:191 · LoginScreen.tsx:79 · DashboardScreen.tsx:34)", () => {
    expectSame(
      cn(alertVariants({ tone: "success", pad: "sm" }), "mx-5 mt-4 flex items-center gap-2"),
      "mx-5 mt-4 bg-[#EEF4F0] border border-[#B2D1BF] rounded-xl px-4 py-2 flex items-center gap-2",
    );
    expectSame(cn(alertVariants({ tone: "success", radius: "2xl", pad: "lg" })), "bg-[#EEF4F0] border border-[#B2D1BF] rounded-2xl px-4 py-3");
    expectSame(
      cn(alertVariants({ tone: "success", radius: "2xl", pad: "sm" }), "flex items-center gap-2"),
      "flex items-center gap-2 bg-[#EEF4F0] border border-[#B2D1BF] rounded-2xl px-4 py-2",
    );
  });
  it("tone={null}이면 지역 색 맵을 className으로 넘길 수 있다 (DocumentsScreen.tsx:79)", () => {
    expectSame(
      cn(alertVariants({ tone: null, radius: "2xl", pad: "x2" }), "flex items-center gap-3", "bg-rose-50 border-rose-200 text-rose-700"),
      "border rounded-2xl px-5 py-4 flex items-center gap-3 bg-rose-50 border-rose-200 text-rose-700",
    );
    // 기본 tone(danger)이 새어 나오지 않아야 한다.
    expect(cn(alertVariants({ tone: null, radius: "2xl", pad: "x2" }))).toBe("border rounded-2xl px-5 py-4");
  });
  it("Dashboard.tsx:42 오렌지 배너도 tone={null} 경로다", () => {
    expectSame(
      cn(alertVariants({ tone: null, radius: "2xl", pad: "xl" }), "flex items-start gap-3", "bg-[#fff8f0] border-orange-200"),
      "bg-[#fff8f0] border border-orange-200 rounded-2xl px-5 py-3.5 flex items-start gap-3",
    );
  });
  it("회색 tone은 없다 — 있으면 Documents 배너의 본문 색을 조용히 떨어뜨리는 함정이 된다", () => {
    // DocumentsScreen.tsx:30-31 원문은 본문 색까지 들고 있다. tone으로 접으면 그 색이 사라진다.
    const unknownBanner = "bg-[#F5F6F8] border-[#E4E6EA] text-[#444444]";
    expectSame(
      cn(alertVariants({ tone: null, radius: "2xl", pad: "x2" }), "flex items-center gap-3", unknownBanner),
      "border rounded-2xl px-5 py-4 flex items-center gap-3 bg-[#F5F6F8] border-[#E4E6EA] text-[#444444]",
    );
    for (const tone of ["danger", "warning", "success"] as const) {
      expect(cn(alertVariants({ tone }))).not.toContain("#F5F6F8");
    }
  });
});

describe("table 상수 — AdminScreen.tsx:157-177 · :183-200", () => {
  it("소스 문자열 그대로", () => {
    expect(tableContainerClass).toBe("overflow-x-auto");
    expect(tableClass).toBe("w-full text-xs");
    expect(tableHeaderClass).toBe("bg-[#F5F6F8] text-[#888888]");
    expect(tableHeadClass).toBe("text-left font-semibold px-4 py-2");
    expect(tableBodyClass).toBe("divide-y divide-[#F5F6F8]");
    expect(tableRowClass).toBe("text-[#444444]");
    expect(tableCellClass).toBe("px-4 py-2");
  });
  it("shadcn 기본값이 섞여 있지 않다", () => {
    const all = [tableClass, tableHeaderClass, tableHeadClass, tableBodyClass, tableRowClass, tableCellClass].join(" ");
    for (const stock of ["h-12", "align-middle", "p-2", "border-b", "caption-bottom", "whitespace-nowrap"]) {
      expect(all.split(/\s+/)).not.toContain(stock);
    }
  });
  it("셀 override — 빈 상태 행은 py-4로 덮어쓴다 (AdminScreen.tsx:164)", () => {
    expectSame(cn(tableCellClass, "px-4 py-4 text-[#888888]"), "px-4 py-4 text-[#888888]");
  });
  it("셀 override — font-mono / truncate 추가 (AdminScreen.tsx:166 · :173)", () => {
    expectSame(cn(tableCellClass, "font-mono"), "px-4 py-2 font-mono");
    expectSame(cn(tableCellClass, "text-[#888888] truncate max-w-[220px]"), "px-4 py-2 text-[#888888] truncate max-w-[220px]");
  });
});

describe("statTileVariants (AdminScreen.tsx:18-20 · CashflowScreen.tsx:370 · :448)", () => {
  it("5개 tone", () => {
    expectSame(cn(statTileVariants()), "rounded-2xl border p-4 bg-white border-[#E4E6EA]");
    expectSame(cn(statTileVariants({ tone: "purple" })), "rounded-2xl border p-4 bg-[#f0eef9] border-[#dddaf4]");
    expectSame(cn(statTileVariants({ tone: "green" })), "rounded-2xl border p-4 bg-[#EEF4F0] border-[#B2D1BF]");
    expectSame(cn(statTileVariants({ tone: "amber" })), "rounded-2xl border p-4 bg-amber-50 border-amber-200");
    expectSame(cn(statTileVariants({ tone: "rose" })), "rounded-2xl border p-4 bg-rose-50 border-rose-200");
  });
  it("CashflowScreen.tsx:448 — SEVERITY 맵은 본문 색까지 들고 있어 tone={null}", () => {
    for (const cls of [
      "bg-[#EEF4F0] border-[#B2D1BF] text-[#2A5A46]",
      "bg-amber-50 border-amber-200 text-amber-800",
      "bg-rose-50 border-rose-200 text-rose-800",
    ]) {
      expectSame(cn(statTileVariants({ tone: null }), cls), `rounded-2xl border p-4 ${cls}`);
    }
  });
});

describe("separator / skeleton / progress — 테이블만 내보내고 컴포넌트는 만들지 않는다", () => {
  it("수직 구분선 3곳 (AnnouncementsScreen.tsx:101 · :109 · :117) — 이게 전부다", () => {
    expectSame(cn(separatorVerticalClass), "w-px h-4 bg-[#E4E6EA]");
  });
  it("스켈레톤 — Admin KPI만 흰 배경 + pulse (AdminScreen.tsx:90)", () => {
    expectSame(cn(skeletonCardClass, "h-24"), "h-24 rounded-2xl bg-white border border-[#E4E6EA] animate-pulse");
  });
  it("진행바 (OnboardingScreen.tsx:201-202)", () => {
    expectSame(cn(progressTrackClass, "mt-4"), "mt-4 h-1 bg-[#E4E6EA] rounded-full overflow-hidden");
    expectSame(cn(progressIndicatorClass), "h-full bg-[#6E62C2] transition-all");
  });
});

// draft-docs 단위(DraftScreen · DocumentsScreen)에서 실제로 쓴 조합 중
// 위 블록들이 다루지 않던 세 가지. 기대값은 이관 전 소스에서 그대로 옮겼다.
describe("draft-docs 단위 — 추가 재현", () => {
  it("due 마감 배지의 세 번째 갈래는 brand다 (DocumentsScreen.tsx:69-72)", () => {
    expectSame(
      cn(badgeVariants({ size: "due", weight: "monoSemibold", tone: "brand", fixed: "shrink0" })),
      "shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border font-mono bg-[#f0eef9] text-[#6E62C2] border-[#dddaf4]",
    );
  });

  it("md + 폰트 유틸 없음 + warning 빈칸 배지 (DraftScreen.tsx:250)", () => {
    expectSame(
      cn(badgeVariants({ size: "md", weight: "none", tone: "warning" })),
      "text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full",
    );
  });

  it("p-5 카드 + space-y-3 (DraftScreen.tsx:216 · :243)", () => {
    expectSame(
      cn(cardVariants({ pad: "p5", shadow: "none" }), "space-y-3"),
      "bg-white border border-[#E4E6EA] rounded-2xl p-5 space-y-3",
    );
  });
});

// calendar-tasks-dash 단위(CalendarScreen · TasksScreen · DashboardScreen)에서 쓴 조합 중
// 위 블록들이 다루지 않던 세 가지. 기대값은 이관 전 소스에서 그대로 옮겼다.
describe("calendar-tasks-dash 단위 — 추가 재현", () => {
  it("xs 배지의 네 번째 갈래는 info다 (CalendarScreen.tsx:216)", () => {
    expectSame(
      cn(badgeVariants({ size: "xs", tone: "info" })),
      "text-[9px] px-1.5 py-0.5 rounded-full border font-medium text-blue-700 border-blue-200 bg-blue-50",
    );
  });

  it("카드 셸 + px-4 py-4 자기여백은 className으로 (CalendarScreen.tsx:259)", () => {
    expectSame(
      cn(cardVariants(), "px-4 py-4"),
      "bg-white border border-[#E4E6EA] rounded-2xl shadow-sm px-4 py-4",
    );
  });

  it("숫자 카드 <Link> — hover 테두리·그림자가 셸 값을 지우지 않는다 (DashboardScreen.tsx:60)", () => {
    expectSame(
      cn(
        cardVariants({ pad: "p5", shadow: "none" }),
        "text-left hover:border-[#D0D3DA] hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer group",
      ),
      "bg-white border border-[#E4E6EA] rounded-2xl p-5 text-left hover:border-[#D0D3DA] hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer group",
    );
  });
});

describe("금지 목록 — stock shadcn 기본값이 어느 테이블에도 없다", () => {
  const surfaces = [
    cn(badgeVariants()),
    cn(chipVariants()),
    cn(alertVariants()),
    cn(cardVariants()),
    cn(cardMutedVariants()),
    cn(cardHeaderVariants()),
    cn(cardContentVariants()),
    cn(statTileVariants()),
    separatorVerticalClass,
    skeletonCardClass,
  ].join(" ");

  it("focus ring · whitespace-nowrap · pointer-events-none · gap-1 아이콘 베이스 없음", () => {
    for (const stock of [
      "whitespace-nowrap",
      "disabled:pointer-events-none",
      "pointer-events-none",
      "focus-visible:ring-[3px]",
      "shrink-0",
      "transition-[color,box-shadow]",
    ]) {
      expect(surfaces.split(/\s+/)).not.toContain(stock);
    }
    expect(surfaces).not.toContain("focus-visible:ring");
    expect(surfaces).not.toContain("dark:");
  });

  it("어느 테이블에도 다크모드 토큰이 없다", () => {
    expect(surfaces).not.toMatch(/\bdark:/);
  });
});
