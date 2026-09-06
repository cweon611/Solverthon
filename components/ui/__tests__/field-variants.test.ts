// field-variants.ts가 내놓는 문자열이 오늘 트리에 박혀 있는 리터럴과 같은 집합인지 고정한다.
// WANT 쪽은 소스에서 복사해 온 원문이다 — 여기를 고치려면 화면 픽셀이 바뀌는 것이므로
// PRD와 사람 승인이 먼저다(PRD §4.1).
//
// 비교는 "정렬된 토큰 배열". cva는 base → variant 순으로 이어 붙이는데, class 속성 안에서
// 토큰 순서는 캐스케이드에 영향을 주지 않는다. 중복 토큰은 정렬 배열이라 그대로 잡힌다.

import { describe, expect, it } from "vitest";

import {
  inputVariants,
  labelVariants,
  selectField,
  textareaVariants,
  type InputVariant,
  type LabelVariant,
  type SelectFieldVariant,
  type TextareaVariant,
} from "@/components/ui/field-variants";
import { cn } from "@/lib/utils";

const tokens = (s: string) => s.trim().split(/\s+/).filter(Boolean).sort();

/* ─── 소스 원문 ─── 각 줄 끝 주석이 이 문자열이 실제로 있는 자리다. */

const INPUT_WANT: Record<InputVariant, string> = {
  // SignupScreen.tsx:13 ≡ LoginScreen.tsx:17 (const INPUT)
  authLg:
    "w-full border border-[#E4E6EA] rounded-xl px-4 py-2.5 text-sm text-[#111111] placeholder-[#888888] focus:outline-none focus:border-[#6E62C2] focus:ring-2 focus:ring-[#6E62C2]/10 disabled:bg-[#F5F6F8]",
  // OnboardingScreen.tsx:22 (const INPUT) ≡ AnnouncementsScreen.tsx:89 (인라인)
  flowLg:
    "w-full border border-[#E4E6EA] rounded-xl px-4 py-2.5 text-sm text-[#111111] placeholder-[#888888] focus:outline-none focus:border-[#6E62C2] focus:ring-2 focus:ring-[#6E62C2]/10",
  // InterviewScreen.tsx:20 (const INPUT)
  chatLg:
    "flex-1 border border-[#E4E6EA] rounded-xl px-4 py-2.5 text-sm text-[#111111] placeholder-[#888888] focus:outline-none focus:border-[#6E62C2] focus:ring-2 focus:ring-[#6E62C2]/10 disabled:bg-[#F5F6F8]",
  // TaskForm.tsx:15 (const inputCls) — design/BridgePage.tsx:688
  rowSm:
    "flex-1 border border-[#E4E6EA] rounded-lg px-3 py-1.5 text-sm text-[#111111] focus:outline-none focus:border-[#6E62C2] focus:ring-1 focus:ring-[#6E62C2]/20",
  // MyPageScreen.tsx:37-38 (const inputCls)
  fieldSm:
    "w-full border border-[#E4E6EA] rounded-lg px-3 py-1.5 text-sm text-[#111111] focus:outline-none focus:border-[#6E62C2] focus:ring-1 focus:ring-[#6E62C2]/20",
  // MiniForm.tsx:10 (const inputCls) — design/BridgePage.tsx:892
  miniXs:
    "w-full border border-[#E4E6EA] rounded-lg px-3 py-1.5 text-xs text-[#111111] focus:outline-none focus:border-[#6E62C2] focus:ring-1 focus:ring-[#6E62C2]/20",
};

// `${INPUT} font-mono` — SignupScreen.tsx:90 · LoginScreen.tsx:107 (사업자등록번호)
const INPUT_MONO_WANT = `${INPUT_WANT.authLg} font-mono`;

const SELECT_WANT: Record<SelectFieldVariant, string> = {
  // MiniForm.tsx:11 (const selectCls) — design/BridgePage.tsx:893
  miniXs:
    "w-full border border-[#E4E6EA] rounded-lg px-3 py-1.5 text-xs text-[#111111] focus:outline-none focus:border-[#6E62C2] bg-white cursor-pointer",
  // TaskForm.tsx:16 (const selectCls) — design/BridgePage.tsx:689
  rowSm:
    "border border-[#E4E6EA] rounded-lg px-3 py-1.5 text-sm text-[#111111] focus:outline-none focus:border-[#6E62C2] bg-white cursor-pointer",
  // MyPageScreen.tsx:199,204 — select인데 inputCls를 입은 두 개
  asInput:
    "w-full border border-[#E4E6EA] rounded-lg px-3 py-1.5 text-sm text-[#111111] focus:outline-none focus:border-[#6E62C2] focus:ring-1 focus:ring-[#6E62C2]/20",
};

const TEXTAREA_WANT: Record<TextareaVariant, string> = {
  // DraftScreen.tsx:260
  draftEditor:
    "w-full border border-[#E4E6EA] rounded-xl px-4 py-3 text-sm text-[#111111] leading-relaxed focus:outline-none focus:border-[#6E62C2] focus:ring-2 focus:ring-[#6E62C2]/10 font-sans",
  // DedupeDemoScreen.tsx:138
  pasteMonoH32:
    "w-full h-32 border border-[#E4E6EA] rounded-2xl p-4 font-mono text-xs text-[#111111] placeholder-[#888888] focus:outline-none focus:border-[#6E62C2] resize-none",
  // DedupeDemoScreen.tsx:157
  pasteMonoH48:
    "w-full h-48 border border-[#E4E6EA] rounded-2xl p-4 font-mono text-xs text-[#111111] placeholder-[#888888] focus:outline-none focus:border-[#6E62C2] resize-none",
  // ParseDemoScreen.tsx:150
  pasteMonoH64:
    "w-full h-64 border border-[#E4E6EA] rounded-2xl p-4 font-mono text-xs text-[#111111] placeholder-[#888888] focus:outline-none focus:border-[#6E62C2] focus:ring-2 focus:ring-[#6E62C2]/10 resize-none",
};

const LABEL_WANT: Record<LabelVariant, string> = {
  // SignupScreen.tsx:14 ≡ LoginScreen.tsx:18 (const LABEL)
  field: "text-[11px] font-semibold text-[#444444] mb-1 block",
  // CashflowScreen.tsx:233,245
  inlineCaption: "text-xs text-[#888888]",
  // CashflowScreen.tsx:290
  inlineCaption11: "text-[11px] text-[#888888]",
};

/* ─── 재현 ─── */

describe("inputVariants", () => {
  for (const [variant, want] of Object.entries(INPUT_WANT) as [InputVariant, string][]) {
    it(`${variant} 는 소스 문자열을 그대로 재현한다`, () => {
      expect(tokens(inputVariants({ variant }))).toEqual(tokens(want));
    });
  }

  it("mono:false 는 아무것도 더하지 않는다", () => {
    expect(tokens(inputVariants({ variant: "authLg", mono: false }))).toEqual(tokens(INPUT_WANT.authLg));
  });

  it("mono:true 는 `${INPUT} font-mono` 템플릿과 같다", () => {
    expect(tokens(inputVariants({ variant: "authLg", mono: true }))).toEqual(tokens(INPUT_MONO_WANT));
  });

  it("6개 계열이 모두 서로 다른 문자열이다", () => {
    const all = Object.values(INPUT_WANT);
    expect(new Set(all).size).toBe(6);
  });
});

describe("selectField (네이티브 <select> 스타일 전용, 컴포넌트 없음)", () => {
  for (const [variant, want] of Object.entries(SELECT_WANT) as [SelectFieldVariant, string][]) {
    it(`${variant} 는 소스 문자열을 그대로 재현한다`, () => {
      expect(tokens(selectField({ variant }))).toEqual(tokens(want));
    });
  }

  it("asInput 은 input fieldSm과 같고, 다른 select들과 다르다", () => {
    expect(tokens(selectField({ variant: "asInput" }))).toEqual(tokens(INPUT_WANT.fieldSm));
    expect(selectField({ variant: "asInput" })).not.toContain("bg-white");
    expect(selectField({ variant: "asInput" })).not.toContain("cursor-pointer");
  });

  it("rowSm 에는 너비 클래스가 없다 (가장 긴 option 기준 고유 너비)", () => {
    expect(tokens(selectField({ variant: "rowSm" })).some((t) => t.startsWith("w-") || t === "flex-1")).toBe(false);
  });
});

describe("textareaVariants", () => {
  for (const [variant, want] of Object.entries(TEXTAREA_WANT) as [TextareaVariant, string][]) {
    it(`${variant} 는 소스 문자열을 그대로 재현한다`, () => {
      expect(tokens(textareaVariants({ variant }))).toEqual(tokens(want));
    });
  }

  it("H32·H48 은 높이만 다르고, H64 만 포커스 링을 갖는다 (통일 금지)", () => {
    const strip = (s: string) => tokens(s).filter((t) => !t.startsWith("h-"));
    expect(strip(textareaVariants({ variant: "pasteMonoH32" })))
      .toEqual(strip(textareaVariants({ variant: "pasteMonoH48" })));
    expect(textareaVariants({ variant: "pasteMonoH32" })).not.toContain("focus:ring");
    expect(textareaVariants({ variant: "pasteMonoH48" })).not.toContain("focus:ring");
    expect(textareaVariants({ variant: "pasteMonoH64" })).toContain("focus:ring-2 focus:ring-[#6E62C2]/10");
  });
});

describe("labelVariants", () => {
  for (const [variant, want] of Object.entries(LABEL_WANT) as [LabelVariant, string][]) {
    it(`${variant} 는 소스 문자열을 그대로 재현한다`, () => {
      expect(tokens(labelVariants({ variant }))).toEqual(tokens(want));
    });
  }

  it("inlineCaption 2종에는 block 이 없다 (flex 행에서 인라인)", () => {
    expect(tokens(labelVariants({ variant: "inlineCaption" }))).not.toContain("block");
    expect(tokens(labelVariants({ variant: "inlineCaption11" }))).not.toContain("block");
    expect(tokens(labelVariants({ variant: "field" }))).toContain("block");
  });
});

/* ─── 포커스 3종이 갈라진 채로 남아 있는지 ───
   하나로 합치면 그게 곧 픽셀 변경이다. 합쳐지면 여기서 깨진다. */

describe("포커스 처리 3종 유지", () => {
  it("ring-2/10 계열", () => {
    for (const s of [
      inputVariants({ variant: "authLg" }),
      inputVariants({ variant: "flowLg" }),
      inputVariants({ variant: "chatLg" }),
      textareaVariants({ variant: "draftEditor" }),
      textareaVariants({ variant: "pasteMonoH64" }),
    ]) {
      expect(s).toContain("focus:ring-2 focus:ring-[#6E62C2]/10");
      expect(s).not.toContain("focus:ring-1");
    }
  });

  it("ring-1/20 계열 (design 원본)", () => {
    for (const s of [
      inputVariants({ variant: "rowSm" }),
      inputVariants({ variant: "fieldSm" }),
      inputVariants({ variant: "miniXs" }),
      selectField({ variant: "asInput" }),
    ]) {
      expect(s).toContain("focus:ring-1 focus:ring-[#6E62C2]/20");
      expect(s).not.toContain("focus:ring-2");
    }
  });

  it("링 없음 계열", () => {
    for (const s of [
      selectField({ variant: "miniXs" }),
      selectField({ variant: "rowSm" }),
      textareaVariants({ variant: "pasteMonoH32" }),
      textareaVariants({ variant: "pasteMonoH48" }),
    ]) {
      expect(s).toContain("focus:outline-none focus:border-[#6E62C2]");
      expect(s).not.toContain("focus:ring");
    }
  });

  it("focus:outline-none 은 모든 컨트롤 문자열에 있다 (shadcn 의 focus-visible 은 쓰지 않는다)", () => {
    const all = [
      ...Object.values(INPUT_WANT),
      ...Object.values(SELECT_WANT),
      ...Object.values(TEXTAREA_WANT),
    ];
    for (const s of all) expect(tokens(s)).toContain("focus:outline-none");
    for (const s of all) expect(s).not.toContain("focus-visible:");
    for (const s of all) expect(s).not.toContain("ring-offset");
  });
});

/* ─── 크기 3단 ─── */

describe("크기 3단", () => {
  it("lg 는 rounded-xl px-4 py-2.5 text-sm", () => {
    for (const v of ["authLg", "flowLg", "chatLg"] as const) {
      const t = tokens(inputVariants({ variant: v }));
      for (const x of ["rounded-xl", "px-4", "py-2.5", "text-sm"]) expect(t).toContain(x);
    }
  });

  it("sm 은 rounded-lg px-3 py-1.5 text-sm", () => {
    for (const v of ["rowSm", "fieldSm"] as const) {
      const t = tokens(inputVariants({ variant: v }));
      for (const x of ["rounded-lg", "px-3", "py-1.5", "text-sm"]) expect(t).toContain(x);
    }
  });

  it("xs(MiniForm) 는 fieldSm 과 글자 크기 하나만 다르다 — PRD §4.5-2, 합치지 않는다", () => {
    const xs = tokens(inputVariants({ variant: "miniXs" }));
    const sm = tokens(inputVariants({ variant: "fieldSm" }));
    expect(xs).toContain("text-xs");
    expect(sm).toContain("text-sm");
    expect(xs.filter((t) => t !== "text-xs")).toEqual(sm.filter((t) => t !== "text-sm"));
  });
});

/* ─── cn() 병합 경로 ───
   컴포넌트는 cn(variantFn(...), className) 으로 렌더한다. tailwind-merge 가 이 문자열들에서
   토큰을 떨어뜨리지 않는지 확인한다 (예: border + border-[#E4E6EA] 를 같은 그룹으로 보면 하나가 날아간다). */

describe("cn() 통과 후에도 토큰 집합이 보존된다", () => {
  const every = [
    ...Object.values(INPUT_WANT),
    INPUT_MONO_WANT,
    ...Object.values(SELECT_WANT),
    ...Object.values(TEXTAREA_WANT),
    ...Object.values(LABEL_WANT),
  ];

  for (const s of every) {
    it(s.slice(0, 46) + "…", () => {
      expect(tokens(cn(s))).toEqual(tokens(s));
    });
  }
});

/* ─── 바이트 순서까지 같은지 (참고용 트립와이어) ───
   위의 정렬 집합 비교가 계약이고, 이건 지금 구성이 우연히 원문과 토큰 순서까지 같다는 사실을 고정한다.
   집합 비교가 통과하는 상태에서 이 블록만 깨진다면 시각 회귀가 아니다 — 기대값을 갱신하면 된다. */

describe("바이트 순서 (참고)", () => {
  it("모든 variant 가 원문과 바이트 단위로 같다", () => {
    for (const [v, want] of Object.entries(INPUT_WANT) as [InputVariant, string][]) {
      expect(inputVariants({ variant: v })).toBe(want);
    }
    expect(inputVariants({ variant: "authLg", mono: true })).toBe(INPUT_MONO_WANT);
    for (const [v, want] of Object.entries(SELECT_WANT) as [SelectFieldVariant, string][]) {
      expect(selectField({ variant: v })).toBe(want);
    }
    for (const [v, want] of Object.entries(TEXTAREA_WANT) as [TextareaVariant, string][]) {
      expect(textareaVariants({ variant: v })).toBe(want);
    }
    for (const [v, want] of Object.entries(LABEL_WANT) as [LabelVariant, string][]) {
      expect(labelVariants({ variant: v })).toBe(want);
    }
  });
});
