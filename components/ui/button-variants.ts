// 비즈버디 버튼 클래스 테이블. JSX·React import 없음 → node 환경 vitest로 검증한다.
//
// 이 테이블은 shadcn의 stock Button base 문자열을 쓰지 않는다. stock base는
//   (1) disabled 상태에서 포인터 이벤트를 통째로 죽인다 — 이 앱의 disabled 자리 19곳 중
//       17곳이 쓰는 "금지"·"대기" 커서가 전부 무력화된다(나머지 2곳은 투명도만 바꾼다),
//   (2) 줄바꿈을 막는다 — 두 줄로 흐르는 menuItem·selectCard 6곳이 넘친다,
//   (3) 디자인에 없는 포커스 링을 넣는다,
//   (4) 이 앱이 쓰지 않는 모서리 반경과 글자 크기·굵기를 기본으로 박는다.
// 넷 다 실제 클래스와 충돌한다(PRD §4.1: 렌더 결과 1px도 바뀌면 안 됨).
// 아래 문자열은 전부 components/screens/*, components/ui/* 의 실제 소스에서 추출했다.
//
// 위 기본값들을 클래스 이름 그대로 적어 두지 않는 이유: Tailwind 스캐너는 주석도 후보로
// 읽어서, 설명하려고 적은 이름이 그대로 죽은 CSS 규칙이 되어 배포된다.
//
// 축이 값을 하나만 내보내므로 pad/text/box/radius 는 서로 충돌하지 않는다.
// cn()이 실제로 필요한 곳은 (1) 호출부 override(글자 굵기·hover 배경·배경색),
// (2) `shadow-md shadow-[#6E62C2]/25` 보존 — __tests__/button-variants.test.ts 참고.

import { cva, type VariantProps } from "class-variance-authority";

/**
 * 93개 <button>(그중 67곳이 <Button>, 26곳은 아직 그대로 남은 <button>) 전부가 공유하는
 * 유일한 클래스. base가 아니라 hand 축의 기본 멤버로 들어간다 —
 * <Link>·<a> 흉내 자리는 소스에 이 클래스가 없어서 끌 수 있어야 한다.
 */
export const BUTTON_BASE = "cursor-pointer";

/**
 * 기본 브랜드 그림자. tailwind-merge가 평탄화하면 elevate:"brand"를 쓰는 버튼 15곳(전부 primary)과
 * 칩 2곳(Simulator:74 · Tasks:65)이 입체감을 잃는다.
 */
export const BRAND_SHADOW = "shadow-md shadow-[#6E62C2]/25";

// base가 비어 있는 이유: 모든 자리가 공유하는 클래스가 이제 하나도 없다.
export const button = cva("", {
  variants: {
    // 색·테두리·hover만 담당한다. 여백·글자크기·모서리·그림자·전환효과는 별도 축.
    variant: {
      // 22곳. 실선 브랜드 채움. 그중 Cashflow:226은 <label>, Expiring:20·Grants:30은
      // <a>/<Link>에 붙일 상수라 <Button>이 아니다.
      primary: "bg-[#6E62C2] text-white font-semibold hover:bg-[#5a50a8]",
      // Draft:184 (옛 DraftScreen BTN_PRIMARY) — 유일하게 테두리를 가진 primary.
      primaryBordered:
        "bg-[#6E62C2] text-white font-semibold border border-[#6E62C2] hover:bg-[#5a50a8]",

      // 13곳. bg-white는 6곳만 쓰므로 호출부 className으로 넘긴다
      // (Cashflow:233,238 · Grants:32,35 · MyPage:357 · TaskForm:68).
      outline: "border border-[#E4E6EA] text-[#444444] font-semibold hover:bg-[#F5F6F8]",

      // 13곳. 브랜드 틴트.
      soft: "text-[#6E62C2] bg-[#f0eef9] border border-[#dddaf4] font-semibold hover:bg-[#dddaf4]",
      // 1x ConditionCoach:49 — soft의 반전(평소 흰색, hover에서 틴트).
      softInverse: "bg-white border border-[#dddaf4] text-left hover:bg-[#f0eef9]",
      // 1x Documents:93 — 같은 반전이지만 글자 정렬을 넣지 않고 글자색·굵기를 갖는다.
      softOnWhite: "text-[#6E62C2] bg-white border border-[#dddaf4] font-semibold hover:bg-[#f0eef9]",

      // 2곳 — MyPage:188 (+ :176 <Link>).
      muted:
        "text-[#888888] bg-[#F5F6F8] border border-[#E4E6EA] font-semibold hover:bg-[#E4E6EA]",

      // 1x MyPage:356. 앱 전체에서 유일한 비브랜드 실선 채움.
      destructive: "bg-rose-600 text-white font-semibold hover:bg-rose-700",

      // 정사각 아이콘 버튼 10곳. 두 가지 톤.
      iconNeutral: "border border-[#E4E6EA] text-[#444444] hover:bg-[#F5F6F8]", // 6x Calendar:104,105 · Cashflow:300,302 · Onboarding:288,291
      iconMuted: "border border-[#E4E6EA] text-[#888888]", // 4x Calendar:213,214 · Tasks:116,119

      // MyPageScreen 설정 행 4곳.
      ghostRow: "text-left text-[#444444] hover:bg-[#F5F6F8]", // 3x MyPage:309,338,343
      ghostRowDanger: "text-left text-rose-600 hover:bg-rose-50", // 1x MyPage:348

      // 드롭다운 항목 1곳(MyPage:317). Onboarding 쪽 쌍둥이는 §4.1.2에서 DropdownMenu로 옮겼다.
      menuItem: "text-left hover:bg-[#F5F6F8] border-b border-[#F5F6F8] last:border-0",

      // 카드 안쪽 전폭 행 4곳(Calendar:250 · Documents:132 · Grants:159,235).
      // 모서리·테두리 없음(부모 카드가 overflow-hidden으로 자름).
      rowDisclosure: "text-left hover:bg-[#F5F6F8]/60",

      // 1x Grants:131. `group`은 자손 span이 소비하므로 호출부에서 className으로 붙인다.
      successBanner:
        "bg-[#EEF4F0] border border-[#B2D1BF] text-left hover:bg-[#D8EAE0]/60",

      // 텍스트 버튼 계열 11곳. 여백·모서리·배경 없음.
      link: "text-[#888888] hover:text-[#6E62C2]", // 5x Cashflow:282 · ConditionCoach:71 · Onboarding:310,405 · Signup:63
      linkBrand: "font-semibold text-[#6E62C2] hover:underline", // 4x Cashflow:275 · Dashboard:18 · Documents:34 · Draft:36
      // 1x Draft:302 — linkBrand에서 글자 굵기만 빠진 것.
      // 같은 모양인 Announcements:174는 아직 인라인이다(재확인 완료 — 이관되지 않았다).
      linkBrandPlain: "text-[#6E62C2] hover:underline",
      linkDanger: "font-semibold text-rose-700 underline", // 1x Interview:163
    },

    // 여백과 글자크기는 저장소에서 자유롭게 조합되므로 별도 축으로 둔다
    // (지금 실제로 쓰이는 pad×text 조합이 21가지다 — 단일 size enum이면 멤버가 그만큼 필요하다).
    pad: {
      none: "",
      "3x1": "px-3 py-1",
      "3x1.5": "px-3 py-1.5",
      "3x2": "px-3 py-2",
      "3x2.5": "px-3 py-2.5",
      "4x1.5": "px-4 py-1.5",
      "4x2": "px-4 py-2",
      "4x2.5": "px-4 py-2.5",
      "4x3": "px-4 py-3",
      "5x2": "px-5 py-2",
      "5x2.5": "px-5 py-2.5",
      "5x3": "px-5 py-3",
      "5x3.5": "px-5 py-3.5",
    },

    text: {
      none: "",
      "10": "text-[10px]",
      "11": "text-[11px]",
      xs: "text-xs",
      sm: "text-sm",
    },

    // 아이콘 버튼 박스 크기 4종.
    box: {
      none: "",
      "6": "w-6 h-6",
      "7": "w-7 h-7",
      "8": "w-8 h-8",
      "10": "w-10 h-10",
    },

    radius: {
      none: "",
      // Cashflow:300/302 뿐. 맨 `rounded`(4px)라서 rounded-lg(8px)로 바뀌면 안 된다.
      DEFAULT: "rounded",
      lg: "rounded-lg",
      xl: "rounded-xl",
      "2xl": "rounded-2xl",
    },

    elevate: {
      none: "",
      sm: "shadow-sm", // 2x Tasks:69 · TaskForm:64
      brand: BRAND_SHADOW, // 15x — 전부 primary
    },

    // 전환효과는 같은 variant 안에서도 갈린다(예: soft 13곳 중 Cashflow:267만 없음).
    // 그래서 variant 문자열에 넣지 않고 축으로 뺐다.
    // 축 이름이 motion인 이유: 축 이름도 스캐너의 후보가 되므로,
    // 유틸리티와 같은 이름을 쓰면 아무도 안 쓰는 규칙이 스타일시트에 실린다.
    motion: {
      none: "",
      colors: "transition-colors",
    },

    // 아이콘 버튼 6곳(Calendar:104,105,213,214 · Tasks:116,119).
    // Onboarding:288/291은 이게 없어서 UA 기본 text-align:center로 정렬된다.
    center: {
      true: "flex items-center justify-center",
      false: "",
    },

    block: { true: "w-full", false: "" }, // 19x

    // disabled 처리는 19곳에서 5가지로 갈린다. 눈에 보이는 차이라 base에 넣지 않는다
    // (이 축이 18곳을 덮고, ParseDemo:148 한 곳은 칩이라 호출부 className에 남아 있다).
    off: {
      none: "",
      o40: "disabled:opacity-40 disabled:cursor-not-allowed", // 7x Cashflow:349 · Dedupe:144,165 · Interview:178,222 · Onboarding:414 · ParseDemo:162
      o40flat: "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none", // 2x Interview:218 · Onboarding:409
      o50: "disabled:opacity-50 disabled:cursor-not-allowed", // 6x Draft:184,189,190 · Login:119 · MyPage:283 · Signup:104
      o50only: "disabled:opacity-50", // 1x Admin:76
      wait: "disabled:opacity-60 disabled:cursor-wait", // 2x Cashflow:439 · ConditionCoach:49
    },

    // 손 모양 커서. <button> 93곳은 소스에 전부 들어 있으므로 기본값이 true다
    // (기존 호출부는 이 축을 넘기지 않아 예전과 똑같은 문자열을 낸다).
    // 이 축을 끄는 <Link>·<a> 흉내 자리는 9곳이다 — about:58,95 · Documents:34,93 ·
    // Draft:36,302 · Login:130 · Onboarding:405 · Signup:63. 브라우저가 이미 같은 커서를 준다.
    // 축·멤버 이름을 유틸리티와 다르게 둔 이유는 파일 맨 위 스캐너 주의 참고.
    hand: { true: BUTTON_BASE, false: "" },
  },

  defaultVariants: {
    pad: "none",
    text: "none",
    box: "none",
    radius: "none",
    elevate: "none",
    motion: "none",
    center: false,
    block: false,
    off: "none",
    hand: true,
  },
});

export type ButtonVariants = VariantProps<typeof button>;

/* ── 토글류는 별도 테이블 ──────────────────────────────────────
   on/off 상태를 button 테이블에 접으면 (variant × on)마다
   compoundVariant가 필요하고, variant:primary + on:false 같은
   말이 안 되는 조합도 타입상 허용된다.
   ───────────────────────────────────────────────────────────── */

/** 옛 OnboardingScreen `CHIP` 상수 원문. 그 상수 자체는 이관으로 사라졌다. */
export const CHIP_BASE =
  "px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer";

// 토글 칩 13곳 중 10곳 — Announcements:106 · Dedupe:127 · Onboarding:260,318,339,351,386 ·
// ParseDemo:148 · Simulator:74 · Tasks:65.
// 남은 3곳은 oddball이라 인라인이다: Announcements:113(OFF 색이 분야마다 다르다) ·
// Announcements:120(ON이 초록) · Onboarding:243(맨 아래 주석 참고).
// elevate는 ON에서만, hoverBorder는 OFF에서만 붙는다 — 소스가 그렇게 되어 있고,
// cva의 단일 축으로는 "한쪽 상태에서만"을 표현할 수 없어 compoundVariants를 쓴다.
export const chip = cva(CHIP_BASE, {
  variants: {
    on: {
      true: "bg-[#6E62C2] text-white border-[#6E62C2]",
      false: "bg-white border-[#E4E6EA] text-[#444444]",
    },
    // 값 문자열은 compoundVariants가 들고 있다(OFF에 그림자가 새지 않도록).
    // sm 3x (Announcements:106 · Dedupe:127 · Onboarding:260) · brand 2x (Simulator:74 · Tasks:65)
    elevate: { none: "", sm: "", brand: "" },
    // OFF 상태의 hover 테두리. Onboarding:339/351만 false.
    hoverBorder: { true: "", false: "" },
  },
  compoundVariants: [
    { on: true, elevate: "sm", class: "shadow-sm" },
    { on: true, elevate: "brand", class: BRAND_SHADOW },
    { on: false, hoverBorder: true, class: "hover:border-[#6E62C2]/40" },
  ],
  defaultVariants: { on: false, elevate: "none", hoverBorder: true },
});

export type ChipVariants = VariantProps<typeof chip>;

// 내보내지 않는다 — 트레이 탭 5곳이 전부 segmented()로 재현되므로 바깥에서 쓸 일이 없다.
const SEGMENTED_BASE = "rounded-lg font-semibold cursor-pointer";

// 트레이 안 탭 5곳 중 4곳(Announcements:97 · Cashflow:292 · Dedupe:116 · Grants:69).
// Draft:197은 ON이 브랜드 채움이라 on 축을 쓰지 않고
// segmented({ on: null, size: "sm", motion: "none" })에 ON/OFF 색을 className으로 붙인다.
export const segmented = cva(SEGMENTED_BASE, {
  variants: {
    on: {
      true: "bg-white text-[#111111] shadow-sm border border-[#E4E6EA]",
      false: "text-[#888888] hover:text-[#444444]",
    },
    // sm 3x (Announcements:97 · Cashflow:292 · Draft:197) · md 2x (Dedupe:116 · Grants:69)
    size: { sm: "px-3 py-1 text-xs", md: "px-5 py-2 text-sm" },
    // none 2x (Cashflow:292 · Draft:197) · all 3x(기본값)
    motion: { none: "", all: "transition-all" },
  },
  defaultVariants: { on: false, size: "sm", motion: "all" },
});

export type SegmentedVariants = VariantProps<typeof segmented>;

/** 옛 OnboardingScreen `CARD` 상수 원문. 그 상수 자체는 이관으로 사라졌다. */
export const SELECT_CARD_BASE =
  "border border-[#E4E6EA] rounded-2xl px-4 py-3 text-left transition-all cursor-pointer hover:border-[#6E62C2]/40";

// Onboarding 선택 카드 4곳 — :226 · :296 · :357 · :373 (뒤 셋은 block: true).
// on:true 문자열은 옛 `CARD_ON` 상수 원문이다.
// 주의: 결과에 border-[#E4E6EA]와 border-[#6E62C2]가 함께 남는다(현재 소스와 동일).
// cn()에 통과시키면 앞의 것이 사라지는데 렌더 결과는 같지만, 소스 재현 테스트는
// raw 출력으로 한다.
export const selectCard = cva(SELECT_CARD_BASE, {
  variants: {
    on: {
      true: "border-[#6E62C2] bg-[#f0eef9] text-[#111111]",
      false: "text-[#444444]",
    },
    block: { true: "w-full", false: "" },
  },
  defaultVariants: { on: false, block: false },
});

export type SelectCardVariants = VariantProps<typeof selectCard>;

/* ── 표로 옮기지 않는다 (Stage 3에서도 인라인 유지) ──────────────
   OnboardingScreen.tsx:243 업종 목록 행: ON에만 글자 굵기가 붙고 OFF에는 없다.
   chip/selectCard처럼 compoundVariants로 풀 수는 있지만, 이 모양을 쓰는 자리가
   앱 전체에서 여기 하나뿐이라 한 곳을 위해 축을 새로 만드는 셈이 된다.
   토글 표(chip)에 억지로 접으면 ON/OFF 굵기 차이가 다른 13곳으로 새어 나간다.
   ───────────────────────────────────────────────────────────── */
