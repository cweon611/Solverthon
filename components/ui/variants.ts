// 컨테이너·표시 계열 클래스 테이블 (JSX 없음 · node 테스트 대상).
// 모든 문자열은 app/ · components/ 실소스에서 그대로 옮겼다. 시각 결과는 불변(PRD §4.1).
// cva는 base → 선언 순서대로 variant → className 순으로 이어 붙인다.
// 클래스 "순서"는 소스와 달라질 수 있으나 캐스케이드는 스타일시트 순서로 정해지므로 렌더 동일.
//
// 세그먼티드 컨트롤(segmentedRoot/Item)은 여기 없다 — button-variants.ts 담당.
//
// 주석 규칙: 버린 shadcn 기본값을 클래스 이름 그대로 적지 않는다. Tailwind 스캐너는 주석까지
// 후보로 읽기 때문에, 설명하려고 적어 둔 이름이 그대로 죽은 CSS 규칙이 되어 배포된다.
// 무엇을 왜 버렸는지는 우리말로 풀어 쓴다.

import { cva, type VariantProps } from "class-variance-authority";

/* ─────────────────────────── CARD ─────────────────────────── */
// 흰 배경 카드 셸 40곳(<Card> 39 + cardVariants 직접 호출 1). 셸에는 패딩이 없고
// header/content가 패딩을 갖는 게 원칙이지만 헤더 없는 자기패딩 카드(p-5 / p-6)도
// 실재하므로 pad 축을 둔다.

export const cardVariants = cva("bg-white border border-[#E4E6EA]", {
  variants: {
    radius: { "2xl": "rounded-2xl", "3xl": "rounded-3xl" },
    pad: { none: "", p5: "p-5", p6: "p-6" },
    shadow: { none: "", sm: "shadow-sm", lg: "shadow-lg" },
    clip: { false: "", true: "overflow-hidden" },
  },
  defaultVariants: { radius: "2xl", pad: "none", shadow: "sm", clip: false },
});
export type CardVariantProps = VariantProps<typeof cardVariants>;
// pad none + shadow sm             → 13x (about:68,83,103,123 · Announcements:140 · Calendar:265 ·
//                                     Grants:291 · MyPage:242,280,303 · ParseDemo:194,257,278)
// pad p5   + shadow none           → 10x (Admin:38,115 · Cashflow:223,387,412,433 · Draft:228,256,298 ·
//                                     Dashboard:20은 <Link>라 cardVariants 직접 호출) · 간격 계열은 className으로
// pad none + shadow sm  + clip     → 6x (Calendar:177,238 · Documents:105,131 · MyPage:161 · ParseDemo:216)
// radius 3xl + clip + shadow sm    → 4x (Interview:118 · Login:65 · Onboarding:179 · Signup:59, 최대 너비는 className)
// pad none + shadow none + clip    → 3x (Admin:165,189 · Draft:234)
// pad p6   + shadow sm             → 2x (Dedupe:182 · Simulator:46)
// pad p5   + shadow sm             → 1x (Dedupe:45)
// shadow lg + clip                 → 1x (Onboarding:192 드롭다운)

export const cardMutedVariants = cva("bg-[#F5F6F8] rounded-2xl", {
  variants: {
    bordered: { false: "", true: "border border-[#E4E6EA]" },
    pad: { p4: "p-4", p5: "p-5", p8: "p-8", p10: "p-10", px5y4: "px-5 py-4", px4y4: "px-4 py-4" },
    center: { false: "", true: "text-center" },
  },
  defaultVariants: { bordered: false, pad: "p5", center: false },
});
// 19곳 전부. 기본값(bordered 없음 · pad p5 · center 없음)만 쓰는 자리는 Dashboard 3곳뿐이다.
// pad p10 + center           → 4x (Announcements:136 · Documents:59 · Draft:157 · Tasks:130)
// pad p5(기본)               → 3x (Dashboard:83,106,131)
// pad p8  + center           → 3x (Documents:101 · Expiring:43 · Grants:90)
// pad p4                     → 2x (Expiring:105 · Grants:287)
// bordered + pad px4y4       → 1x (Calendar:232)
// bordered + pad p5          → 1x (Cashflow:423)
// pad px5y4                  → 1x (Cashflow:468)
// bordered + center          → 1x (Dedupe:135)
// bordered + pad px5y4       → 1x (Draft:177)
// bordered + pad p8 + center → 1x (Simulator:122)
// bordered + pad p4          → 1x (Simulator:131)

export const cardHeaderVariants = cva("border-b border-[#E4E6EA]", {
  variants: {
    size: {
      default: "px-5 py-4",
      compact: "px-4 py-3",
      tight: "px-5 py-3",
      auth: "px-7 pt-7 pb-5",
      chat: "px-6 pt-6 pb-4",
    },
    layout: { block: "", between: "flex items-center justify-between", row: "flex items-center gap-2" },
  },
  defaultVariants: { size: "default", layout: "block" },
});
export type CardHeaderVariantProps = VariantProps<typeof cardHeaderVariants>;
// default+block 7x (about:69,84,104 · MyPage:243,304 · ParseDemo:195,258)
// default+between 3x (MyPage:162,281 · ParseDemo:279) · default+row 1x (ParseDemo:217)
// compact+block 2x (Calendar:239 · Calendar:191은 <div>라 cardHeaderVariants 직접 호출)
// compact+between 1x (Calendar:178)
// tight+row 1x (Draft:235) · auth+block 2x (Login:66 · Signup:60)
// chat+block 1x (Interview:122) — 이 자리의 행 간격은 layout row(간격 2)보다 넓은 2.5라서
// layout은 block으로 두고 flex 행 자체를 className으로 넘긴다.
// 같은 여백을 쓰는 Onboarding:182는 아래 테두리가 없어 이 표의 base와 어긋난다 → 인라인 유지(재확인 완료).

export const cardContentVariants = cva("", {
  variants: {
    size: { none: "", default: "px-5 py-4", tight: "px-5 py-3" },
    list: { false: "", true: "divide-y divide-[#F5F6F8]" },
  },
  defaultVariants: { size: "default", list: false },
});
export type CardContentVariantProps = VariantProps<typeof cardContentVariants>;
// size default    → 5x (about:73은 <ul>이라 함수 직접 호출 · about:107 · MyPage:201 · ParseDemo:198,290)
// size none+list  → 6x (about:87 · Calendar:196,243 · Draft:239 · MyPage:286 · ParseDemo:224)
// size tight      → 2x (MyPage:307 · ParseDemo:262)
// 헤더 쪽 compact(px-4 py-3)에 대응하는 본문 멤버는 두지 않는다 — 쓰는 곳이 없었다.

// 20곳이 쓰지만 그중 9곳은 카드 제목이 아니고(리스트 행 제목·알림 제목·회사명),
// 태그도 h2 14곳 · p 5곳 · span 1곳으로 갈린다(h3는 현재 0곳).
// 컴포넌트가 아니라 상수로 내보내 각 호출부가 태그를 유지하게 한다.
export const cardTitleClass = "text-[#111111] font-semibold text-sm";
// 구분선 리스트 컨테이너 6곳은 별도 상수를 두지 않는다 —
// cardContentVariants({ size: "none", list: true })가 같은 문자열을 낸다.
// MyPage:263 한 곳만 표 밖에 남는다 — 같은 구분선에 표에 없는 자기 여백을 함께 들고 있다.

/* ─────────────────────────── BADGE ────────────────────────── */
// size × weight × tone 3축. success 하나가 xs/sm/lg/cell 4개 크기로 쓰이고,
// brand 하나가 같은 크기에서 font-mono/medium/semibold/무지정 4가지로 갈린다.

export const badgeVariants = cva("rounded-full", {
  variants: {
    size: {
      xs: "text-[9px] px-1.5 py-0.5", // 5x Calendar:218,221 · Login:69 · Sidebar:69,83
      // 8x Admin:203 · Announcements:151,154,157 · ConditionCoach:79 ·
      //    Expiring:67 · Grants:71 · Sidebar:113 (뒤 셋은 색이 지역 — tone:null)
      sm: "text-[10px] px-1.5 py-0.5",
      md: "text-[10px] px-2 py-0.5", // 8x Dedupe:47 · Draft:263,264 · Grants:113,301 · ParseDemo:219,228 · Tasks:100
      md11: "text-[11px] px-2 py-0.5", // 1x Draft:247
      lg: "text-[11px] px-2.5 py-1", // 5x Announcements:142 · Dedupe:202 · Grants:104,237 · ParseDemo:291
      cell: "text-[10px] px-2 py-1 w-fit", // 1x Documents:121 (그리드 셀 안)
      count: "text-xs px-2 py-0.5", // 2x Grants:86,230
      due: "text-xs px-3 py-1.5", // 1x Documents:80
    },
    // weight를 size에서 분리한 이유: brand 계열이 같은 크기에서 폰트만 다르다.
    weight: {
      none: "", // 5x Admin:203 · Announcements:154,157 · Draft:263,264 (폰트 유틸 자체가 없다)
      // 6x — Grants:113만 명시하고 나머지 5곳은 기본값을 받는다
      //      (Calendar:218,221 · ConditionCoach:79 · Grants:301 · Tasks:100)
      medium: "font-medium",
      // 10x Announcements:142,151 · Dedupe:47,202 · Documents:121 ·
      //     Expiring:67 · Grants:104,237 · ParseDemo:291 · Sidebar:83
      semibold: "font-semibold",
      mono: "font-mono", // 6x Draft:247 · Grants:71,86,230 · ParseDemo:219,228
      monoSemibold: "font-semibold font-mono", // 4x Documents:80 · Login:69 · Sidebar:69,113
    },
    // 무테 6곳 — Expiring:67 · Grants:71 · Login:69 · Sidebar:69,83,113
    bordered: { true: "border", false: "" },
    // 아래 숫자는 "이 tone이 나올 수 있는 <span> 자리"의 개수다(맵 정의 줄이 아니라 렌더 위치).
    tone: {
      // 9x 대상·여유·중복·완료 — Admin:203 · Announcements:151 · Calendar:218 ·
      //    ConditionCoach:79 · Dedupe:202 · Documents:121 · Grants:104,237 · ParseDemo:291
      success: "bg-[#EEF4F0] text-[#2A5A46] border-[#B2D1BF]",
      successAlt: "text-[#3D7260] bg-[#EEF4F0] border-[#B2D1BF]", // 1x Grants:86 — #2A5A46와 다른 두 번째 초록
      // 6x 조건부·서둘러야·검토 필요·빈칸 — Dedupe:202 · Documents:121 · Draft:263 ·
      //    Grants:104,237 · ParseDemo:291
      warning: "bg-amber-50 text-amber-700 border-amber-200",
      dangerSoft: "bg-rose-50 text-rose-600 border-rose-200", // 3x 제외 — Grants:104,237 · ParseDemo:291
      // 3x 마감임박·마감 초과 — Announcements:142 · Documents:80 · Documents:121
      // dangerSoft와 본문 색이 한 단 다르다. 합치면 위 6곳이 다시 칠해진다.
      danger: "bg-rose-50 text-rose-700 border-rose-200",
      // 8x 마감·별개·미완료·상시 접수·시연용 — Announcements:142,154 · Calendar:218 ·
      //    ConditionCoach:79 · Dedupe:202 · Documents:80,121 · Grants:230
      muted: "bg-[#F5F6F8] text-[#888888] border-[#E4E6EA]",
      // 8x 분야·출처·조건·동시 게시·마감일 — Announcements:157 · Dedupe:47 · Documents:80 ·
      //    Draft:247,264 · Grants:113 · ParseDemo:219,228
      brand: "text-[#6E62C2] bg-[#f0eef9] border-[#dddaf4]",
      brandPlain: "text-[#6E62C2] bg-[#f0eef9]", // 3x BETA·업력 (무테) — Login:69 · Sidebar:69,83
      info: "bg-blue-50 text-blue-700 border-blue-200", // 4x 날짜형·접수중 — Announcements:142 · Calendar:221 · Grants:301 · Tasks:100
      purple: "text-purple-700 border-purple-200 bg-purple-50", // 3x 이벤트형 — Calendar:221 · Grants:301 · Tasks:100
      // 색을 지역 문자열로 넘기는 tone:null 3곳 — Expiring:67 · Grants:71 · Sidebar:113
    },
    // 키 이름을 출력 유틸리티와 똑같이 적는다. 짧게 줄이면(예: 축약형 두 개) 그 축약형이
    // 그대로 Tailwind 유틸리티 이름과 겹쳐, 쓰지도 않는 규칙이 스타일시트에 실려 나간다.
    // shrink0 5x (Announcements:142 · Documents:80 · Draft:247 · Grants:104,237)
    // inlineBlock 2x (Dedupe:202 · ParseDemo:291) · 나머지 24곳은 none
    fixed: { none: "", shrink0: "shrink-0", inlineBlock: "inline-block" },
  },
  defaultVariants: { size: "md", weight: "medium", bordered: true, tone: "muted", fixed: "none" },
});
export type BadgeVariantProps = VariantProps<typeof badgeVariants>;

// 기존 4개 지역 조회 맵의 드롭인 대체 — 키 동일, 출력 동일. 원래 맵은 이관으로 사라졌고
// 아래 주석은 지금 이 맵을 tone으로 넘기는 자리를 가리킨다.
export const grantStatusBadge = { pass: "success", fail: "dangerSoft", conditional: "warning" } as const; // 3x Grants:104,237 · ParseDemo:291
export const annStatusBadge = { open: "info", closing: "danger", closed: "muted" } as const; // 1x Announcements:142
export const dedupeStatusBadge = { duplicate: "success", review: "warning", distinct: "muted" } as const; // 1x Dedupe:202
export const leadTimeBadge = { ok: "success", tight: "warning", late: "danger", unknown: "muted" } as const; // 1x Documents:121

// rounded-lg 칩은 pill 계열과 형태가 달라 별도 테이블로 둔다(3곳뿐이라 shape 축은 낭비).
export const chipVariants = cva("rounded-lg px-2 py-1 font-medium border", {
  variants: {
    tone: {
      danger: "text-rose-600 text-[11px] bg-rose-50 border-rose-200", // 2x Grants:311 · Tasks:113 (완전 동일 쌍둥이)
      warning: "text-[10px] bg-amber-50 text-amber-700 border-amber-200", // 1x Grants:313
    },
  },
  defaultVariants: { tone: "danger" },
});

/* ─────────────────────────── ALERT ────────────────────────── */
// 인라인 알림 박스 25곳(아래 tone 3종이 23곳 + 지역 색 2곳). 아이콘은 어디에도 없다.
// 색까지 갖는 지역 맵은 Documents:36-42(OVERALL_BANNER) 하나뿐이다. 이건 tone: null로 두고
// 그 맵 문자열을 className으로 넘긴다(Documents:89). Dashboard:54 오렌지 배너도 같은 방식이다.
// Cashflow:41-45(SEVERITY)은 알림 박스가 아니라 아래 statTile 모양(:455)이므로 여기 오지 않는다.

export const alertVariants = cva("border", {
  variants: {
    tone: {
      // 13x(기본값) — Admin:89,95 · Cashflow:444 · ConditionCoach:62 · Dedupe:176 · Draft:215 ·
      //       Grants:254 · Interview:161 · Login:117 · MyPage:353 · ParseDemo:186 · Signup:102 · Simulator:103
      danger: "bg-rose-50 border-rose-200",
      // 7x — Draft:318 · Grants:249 · Login:77 · MyPage:235 · ParseDemo:241 · Signup:71 · Simulator:85
      warning: "bg-amber-50 border-amber-200",
      // 3x — Dashboard:45 · Login:85 · MyPage:195
      success: "bg-[#EEF4F0] border-[#B2D1BF]",
      // 회색 알림 tone은 두지 않는다: 후보였던 Documents 배너 2건(unknown/rolling)은 본문 색까지
      // 함께 들고 있어 tone: null + className으로 가고, 회색 상자 나머지는 전부 cardMuted 모양이다.
    },
    // xl 13x(기본값) · 2xl 12x
    radius: { xl: "rounded-xl", "2xl": "rounded-2xl" },
    pad: {
      xs: "px-3 py-2", // 1x ConditionCoach:62
      xsTall: "px-3 py-2.5", // 2x Grants:249 · :254 (xs와 좌우 여백은 같고 위아래만 한 단 넓다)
      sm: "px-4 py-2", // 3x Dashboard:45 · MyPage:195,235
      md: "px-4 py-2.5", // 4x(기본값) Cashflow:444 · Interview:161 · Login:117 · Signup:102
      lg: "px-4 py-3", // 7x Dedupe:176 · Draft:215 · Login:77,85 · MyPage:353 · ParseDemo:186 · Signup:71
      xl: "px-5 py-3.5", // 1x Dashboard:54 (오렌지 배너 — tone은 지역 유지)
      x2: "px-5 py-4", // 2x Documents:89 · ParseDemo:241
      p5: "p-5", // 3x Draft:318 · Simulator:85,103
      p6: "p-6", // 2x Admin:89,95
    },
  },
  defaultVariants: { tone: "danger", radius: "xl", pad: "md" },
});
export type AlertVariantProps = VariantProps<typeof alertVariants>;

/* ─────────────────────────── TABLE ────────────────────────── */
// AdminScreen.tsx:166 · :190 두 개만 대상. shadcn 기본 표는 헤드셀에 고정 높이를 주고,
// 셀 여백을 더 좁게 잡고, 셀을 세로 가운데 정렬하고, 행마다 아래 테두리를 긋는다.
// 그 넷을 전부 버리고 아래 상수(셀 여백 + tbody 구분선)만 쓴다 — 하나라도 남기면 행 높이가 바뀐다.
// 기본값 클래스 이름을 여기 적지 않는 이유: Tailwind 스캐너는 주석도 읽어서,
// 적어 두기만 해도 쓰지 않는 규칙이 스타일시트에 실려 나간다.

export const tableContainerClass = "overflow-x-auto";
export const tableClass = "w-full text-xs";
export const tableHeaderClass = "bg-[#F5F6F8] text-[#888888]";
export const tableHeadClass = "text-left font-semibold px-4 py-2";
export const tableBodyClass = "divide-y divide-[#F5F6F8]";
export const tableRowClass = "text-[#444444]";
export const tableCellClass = "px-4 py-2";

/* ───────────────────────── STAT TILE ──────────────────────── */
// 이 표를 부르는 자리는 3곳이다: 지역 <Kpi>(Admin:25 정의 · :27 호출, 렌더는 :109-113 ·
// :141-143 · :150-155 총 14번) · Cashflow:377(KPI 4장) · Cashflow:455.
// Cashflow:455는 SEVERITY 맵(:41-45)이 본문 색까지 들고 있어 tone: null + className으로 간다.

export const statTileVariants = cva("rounded-2xl border p-4", {
  variants: {
    tone: {
      default: "bg-white border-[#E4E6EA]", // Admin:27 · Cashflow:377
      purple: "bg-[#f0eef9] border-[#dddaf4]", // Admin:27
      green: "bg-[#EEF4F0] border-[#B2D1BF]", // Admin:27 · Cashflow:377
      amber: "bg-amber-50 border-amber-200", // Cashflow:377
      rose: "bg-rose-50 border-rose-200", // Cashflow:377
    },
  },
  defaultVariants: { tone: "default" },
});

/* ───────────────────────── SEPARATOR ──────────────────────── */
// 진짜 독립 구분선은 3개뿐이고 전부 세로다(Announcements:102,110,118). <hr>은 0개.
// 가로 구분선은 사용처가 0이라 표를 만들지 않았다 — 축이 하나뿐인 cva는 상수와 같고,
// 쓰이지 않는 쪽 문자열까지 스타일시트에 실린다.
// 나머지 위/아래 테두리 17곳은 이미 존재하는 요소의 테두리라
// 노드를 새로 끼우면 레이아웃이 밀린다 → 컴포넌트도 만들지 않는다.

export const separatorVerticalClass = "w-px h-4 bg-[#E4E6EA]";

/* ───────────────────────── SKELETON ───────────────────────── */
// 이 앱의 스켈레톤은 두 종류인데 서로 호환되지 않는다: ShellSkeleton(AppShell:22-44)과
// app/page.tsx:19-21은 연회색 블록에 애니메이션이 없고, Admin:98만 흰 카드에 맥동을 준다.
// 공통 표를 두면 어느 한쪽에 없는 속성이 붙으므로, 실제 사용처가 하나뿐인 아래 상수만 남긴다.
// (애니메이션 없는 쪽은 인라인 유지 — 묶을 만한 반복이 아니다.)

// 크기(h-8 w-64 등)는 호출부가 className으로 넘긴다.
export const skeletonCardClass = "rounded-2xl bg-white border border-[#E4E6EA] animate-pulse"; // 1x Admin:98 전용

/* ───────────────────────── PROGRESS ───────────────────────── */
// 앱 전체에서 확정형 진행바는 Onboarding:205-206 하나뿐이다.

export const progressTrackClass = "h-1 bg-[#E4E6EA] rounded-full overflow-hidden";
export const progressIndicatorClass = "h-full bg-[#6E62C2] transition-all";
// 차트 막대(Admin:45 · Cashflow:398,399,418)는 rounded-full이 아니라 rounded다. 손대지 않는다.
