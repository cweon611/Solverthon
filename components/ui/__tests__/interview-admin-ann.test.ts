// interview-admin-ann 단위(InterviewScreen · AdminScreen · AnnouncementsScreen)에서
// 이관한 자리 중 기존 3개 테스트가 다루지 않던 조합만 모았다.
// 기대값은 전부 이관 전 소스 문자열을 그대로 복사한 것이다(PRD §4.1 — 렌더 불변).
// 비교는 다른 파일과 같은 "정렬된 클래스 토큰 집합"이다.

import { describe, expect, it } from "vitest";

import { badgeVariants, cardTitleClass, cardVariants, tableCellClass } from "@/components/ui/variants";
import { cn } from "@/lib/utils";

const tokens = (s: string) => [...new Set(s.trim().split(/\s+/).filter(Boolean))].sort();
const expectSame = (actual: string, source: string) => expect(tokens(actual)).toEqual(tokens(source));

describe("InterviewScreen", () => {
  it("인터뷰 셸 (InterviewScreen.tsx:115) — Login:59·Signup:54와 같은 3xl 셸에 grid만 추가", () => {
    expectSame(
      cn(cardVariants({ radius: "3xl", clip: true }), "w-full max-w-4xl grid md:grid-cols-[1fr_300px]"),
      "w-full max-w-4xl bg-white border border-[#E4E6EA] rounded-3xl shadow-sm overflow-hidden grid md:grid-cols-[1fr_300px]",
    );
  });

  it("빈 상태 제목 (InterviewScreen.tsx:134) — cardTitleClass와 바이트 단위로 같다", () => {
    expect(cardTitleClass).toBe("text-[#111111] font-semibold text-sm");
  });
});

describe("AdminScreen 표 셀 — 기존 override 3종 외 2종", () => {
  it("아이디 열 (AdminScreen.tsx:192)", () => {
    expectSame(cn(tableCellClass, "font-semibold text-[#111111]"), "px-4 py-2 font-semibold text-[#111111]");
  });

  it("실패 열 (AdminScreen.tsx:171) — 폰트 계열과 굵기가 함께 남는다", () => {
    expectSame(cn(tableCellClass, "font-mono text-rose-600 font-semibold"), "px-4 py-2 font-mono text-rose-600 font-semibold");
    expectSame(cn(tableCellClass, "font-mono "), "px-4 py-2 font-mono");
  });
});

describe("AnnouncementsScreen", () => {
  it("공고 카드 행 (AnnouncementsScreen.tsx:139) — 자기 여백과 hover 테두리를 className으로 얹는다", () => {
    expectSame(
      cn(cardVariants(), "px-5 py-4 flex items-center gap-4 hover:border-[#6E62C2]/30 transition-all"),
      "bg-white border border-[#E4E6EA] rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm hover:border-[#6E62C2]/30 transition-all",
    );
    // 마감 공고는 흐리게 — 조건부 토큰이 붙어도 나머지가 그대로다.
    expectSame(
      cn(cardVariants(), cn("px-5 py-4 flex items-center gap-4 hover:border-[#6E62C2]/30 transition-all", "opacity-60")),
      "bg-white border border-[#E4E6EA] rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm hover:border-[#6E62C2]/30 transition-all opacity-60",
    );
    // hover 테두리 색이 기본 테두리 색을 지우지 않는다.
    expect(tokens(cn(cardVariants(), "hover:border-[#6E62C2]/30"))).toContain("border-[#E4E6EA]");
  });

  it("시연용 배지 (AnnouncementsScreen.tsx:153) — 폰트 유틸이 없는 sm muted", () => {
    expectSame(
      cn(badgeVariants({ size: "sm", weight: "none", tone: "muted" })),
      "text-[10px] text-[#888888] bg-[#F5F6F8] border border-[#E4E6EA] px-1.5 py-0.5 rounded-full",
    );
  });

  it("동시 게시 배지 (AnnouncementsScreen.tsx:156) — 폰트 유틸이 없는 sm brand", () => {
    expectSame(
      cn(badgeVariants({ size: "sm", weight: "none", tone: "brand" })),
      "text-[10px] bg-[#f0eef9] text-[#6E62C2] border border-[#dddaf4] px-1.5 py-0.5 rounded-full",
    );
  });

  it("공고 제목 (AnnouncementsScreen.tsx:148) — cardTitleClass 그대로", () => {
    expect(cardTitleClass).toBe("text-[#111111] font-semibold text-sm");
  });
});
