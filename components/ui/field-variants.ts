// 폼 컨트롤(input · textarea · label · 네이티브 select) 클래스 테이블.
// 모든 문자열은 현재 소스에서 그대로 옮겨온 것이라 렌더 결과가 1픽셀도 달라지지 않는다(PRD §4.1).
// JSX·React import 없음 — node 환경 테스트(components/ui/__tests__)가 이 파일만 읽는다.
//
// 이 표가 없앤 중복(옛 지역 상수들은 이관으로 전부 사라졌다 — 이제 남은 건 아래 호출부뿐):
//   authLg  ← Signup·Login의 `INPUT` 상수 두 개가 바이트 동일했다 (지금 7곳)
//   flowLg  ← Onboarding의 `INPUT` 상수 ≡ Announcements 인라인 리터럴 (지금 8곳)
//   chatLg  ← Interview의 `INPUT` 상수 (지금 1곳)
//   label field ← Signup·Login의 `LABEL` 상수 두 개 (지금 7곳)
//   rowSm/fieldSm/miniXs ← TaskForm·MiniForm의 inputCls/selectCls와 MyPage 지역 문자열

import { cva, type VariantProps } from "class-variance-authority";

/* ─────────────── 공통 토큰 ───────────────
   아래 9개는 이 파일 안에서 variant 문자열을 조립하는 데만 쓴다. 내보내지 않는다 —
   Stage 3에서 인라인으로 남는 예외들(맨 아래 목록)은 어느 것도 이 조각을 필요로 하지 않고,
   내보내면 "조각을 새로 조합해 새 계열을 만들어도 된다"는 잘못된 신호가 된다. */

/** 모든 컨트롤이 공유하는 테두리. */
const FIELD_BORDER = "border border-[#E4E6EA]";
/** 모든 컨트롤이 공유하는 본문 색. */
const FIELD_TEXT = "text-[#111111]";
/** 값이 없을 때 회색. rowSm·fieldSm·miniXs에는 없다(브라우저 기본 회색에 의존). */
const FIELD_PLACEHOLDER = "placeholder-[#888888]";

/* ─────────────── 크기 3단 ───────────────
   나머지(Cashflow의 1회용 세 가지)는 표에 넣지 않는다 — 맨 아래 예외 목록 참고. */

/** lg 단 — 로그인·가입·온보딩·인터뷰. */
const SIZE_LG = "rounded-xl px-4 py-2.5 text-sm";
/** sm 단 — TaskForm·MyPage. */
const SIZE_SM = "rounded-lg px-3 py-1.5 text-sm";
/** xs 단 — MiniForm. sm과 글자 크기만 다르다. 합치지 않는다(PRD §4.5-2, MiniForm.tsx:13). */
const SIZE_XS = "rounded-lg px-3 py-1.5 text-xs";

/* ─────────────── 포커스 3종 ───────────────
   세 갈래가 실제로 공존한다. 하나로 통일하면 그 자체가 픽셀 변경이므로 그대로 둔다.
   shadcn 기본값(테마 링 색 + 링 바깥 여백을 키보드 포커스에서만 켜지는 상태로 묶은 조합)은
   전부 버린다 — 이 앱은 13개 문자열 전부가 기본 아웃라인을 끄고 직접 칠하는 방식이고,
   링 바깥 여백이라는 개념 자체가 없다. 버린 이름을 클래스 그대로 적지 않는 이유는
   Tailwind 스캐너가 주석도 후보로 읽어 죽은 규칙을 만들기 때문이다. */

/** ring-2 / 10% — 앱 이후에 생긴 다수파(auth · flow · chat · draft · parse). */
const FOCUS_RING_2 = "focus:outline-none focus:border-[#6E62C2] focus:ring-2 focus:ring-[#6E62C2]/10";
/** ring-1 / 20% — design/BizBuddyPage.tsx:688,892 원본 계열(TaskForm · MiniForm · MyPage). */
const FOCUS_RING_1 = "focus:outline-none focus:border-[#6E62C2] focus:ring-1 focus:ring-[#6E62C2]/20";
/** 링 없음 — 테두리 색만 바뀐다(select 2종 · DedupeDemo textarea 2종). */
const FOCUS_BORDER_ONLY = "focus:outline-none focus:border-[#6E62C2]";

/* ─────────────── input ─────────────── */

export const inputVariants = cva("", {
  variants: {
    variant: {
      /** 7x Login:103,108,113 · Signup:78,84,89,95. disabled가 실제로 스타일된 유일한 계열. */
      authLg: `w-full ${FIELD_BORDER} ${SIZE_LG} ${FIELD_TEXT} ${FIELD_PLACEHOLDER} ${FOCUS_RING_2} disabled:bg-[#F5F6F8]`,
      /** 8x Announcements:85 · Onboarding:217,218,238,271,308,334,347. authLg에서 disabled:bg만 빠진 것 — 의도적. */
      flowLg: `w-full ${FIELD_BORDER} ${SIZE_LG} ${FIELD_TEXT} ${FIELD_PLACEHOLDER} ${FOCUS_RING_2}`,
      /** 1x Interview:170. 전송 버튼과 같은 flex 행에 있어 w-full이 아니라 flex-1. */
      chatLg: `flex-1 ${FIELD_BORDER} ${SIZE_LG} ${FIELD_TEXT} ${FIELD_PLACEHOLDER} ${FOCUS_RING_2} disabled:bg-[#F5F6F8]`,
      /** 4x TaskForm:40,52,56,60. placeholder 색 없음, 링은 1/20. */
      rowSm: `flex-1 ${FIELD_BORDER} ${SIZE_SM} ${FIELD_TEXT} ${FOCUS_RING_1}`,
      /** 3x MyPage:214,219,224. rowSm의 w-full판. select 2개도 이 문자열을 입는다(selectField.asInput). */
      fieldSm: `w-full ${FIELD_BORDER} ${SIZE_SM} ${FIELD_TEXT} ${FOCUS_RING_1}`,
      /** 4x MiniForm:21,27,29,30. fieldSm과 text-xs 하나만 다르다. */
      miniXs: `w-full ${FIELD_BORDER} ${SIZE_XS} ${FIELD_TEXT} ${FOCUS_RING_1}`,
    },
    /** 2x Login:113 · Signup:95 — 옛 `${INPUT} font-mono` 템플릿 리터럴 대체. 사업자등록번호 전용. */
    mono: { true: "font-mono", false: "" },
  },
});

/* ─────────────── 네이티브 select ───────────────
   §4.1.2 이후 6개 중 4개는 Radix 기반 <Select>(components/ui/select.tsx)로 옮겼다.
   이 표는 아직 네이티브로 남은 것에 className으로만 붙인다 — 현재 MyPage:214,219의
   selectField.asInput 2곳. miniXs·rowSm 항목은 호출부가 0곳이지만 <Select>의 트리거가
   같은 치수를 재현하는 기준이라 남겨 둔다(지우면 스캔되던 문자열이 사라져 게이트가 깨진다). */

export const selectField = cva("", {
  variants: {
    variant: {
      /** 1x MiniForm:23. input miniXs에서 링을 빼고 bg-white cursor-pointer를 더한 것. */
      miniXs: `w-full ${FIELD_BORDER} ${SIZE_XS} ${FIELD_TEXT} ${FOCUS_BORDER_ONLY} bg-white cursor-pointer`,
      /** 1x TaskForm:45. 너비 클래스가 아예 없다 — 가장 긴 <option> 기준 고유 너비가 의도. */
      rowSm: `${FIELD_BORDER} ${SIZE_SM} ${FIELD_TEXT} ${FOCUS_BORDER_ONLY} bg-white cursor-pointer`,
      /** 2x MyPage:204,209. 유일하게 *input* 클래스를 입은 select — 링 1/20이 있고
       *  bg-white·cursor-pointer가 없다. 다른 select와 같게 맞추면 픽셀이 바뀐다. */
      asInput: `w-full ${FIELD_BORDER} ${SIZE_SM} ${FIELD_TEXT} ${FOCUS_RING_1}`,
    },
  },
});

/* ─────────────── textarea ─────────────── */

export const textareaVariants = cva("", {
  variants: {
    variant: {
      /** 1x Draft:269. px-4 py-3 + leading-relaxed + font-sans 재선언은 여기뿐.
       *  읽기 모드 <p>(Draft:276)가 같은 테두리·반경·패딩을 따라 하므로 둘은 함께 움직여야 한다. */
      draftEditor: `w-full ${FIELD_BORDER} rounded-xl px-4 py-3 text-sm ${FIELD_TEXT} leading-relaxed ${FOCUS_RING_2} font-sans`,
      /** 1x Dedupe:141. 링 없음. */
      pasteMonoH32: `w-full h-32 ${FIELD_BORDER} rounded-2xl p-4 font-mono text-xs ${FIELD_TEXT} ${FIELD_PLACEHOLDER} ${FOCUS_BORDER_ONLY} resize-none`,
      /** 1x Dedupe:160. H32와 높이만 다르다. 링 없음. */
      pasteMonoH48: `w-full h-48 ${FIELD_BORDER} rounded-2xl p-4 font-mono text-xs ${FIELD_TEXT} ${FIELD_PLACEHOLDER} ${FOCUS_BORDER_ONLY} resize-none`,
      /** 1x ParseDemo:154. 같은 계열인데 이것만 focus:ring-2를 갖는다. 형제와 맞추지 않는다. */
      pasteMonoH64: `w-full h-64 ${FIELD_BORDER} rounded-2xl p-4 font-mono text-xs ${FIELD_TEXT} ${FIELD_PLACEHOLDER} ${FOCUS_RING_2} resize-none`,
    },
  },
});

/* ─────────────── label ───────────────
   @radix-ui/react-label을 쓰지 않는다(미설치). Radix Label이 더해 주는 건 중첩 컨트롤로의
   클릭 전달뿐인데, 이 앱의 진짜 label 7개는 이미 전부 htmlFor를 쓴다. */

export const labelVariants = cva("", {
  variants: {
    variant: {
      /** 7x Login:102,107,112 · Signup:77,83,88,94. htmlFor로 묶인 유일한 label 7개. */
      field: "text-[11px] font-semibold text-[#444444] mb-1 block",
      /** 2x Cashflow:242,254. htmlFor 없는 장식용 — block이 없어 flex 행에서 인라인으로 앉는다. */
      inlineCaption: "text-xs text-[#888888]",
      /** 1x Cashflow:298. inlineCaption의 11px판. −/+ 버튼 쌍을 가리켜 htmlFor가 불가능하다. */
      inlineCaption11: "text-[11px] text-[#888888]",
    },
  },
});

/* ─────────────── 타입 ───────────────
   variant를 선택 항목으로 두지 않는다(cva defaultVariants 미사용). 기본값이 있으면
   호출부가 variant를 빠뜨렸을 때 조용히 다른 계열로 렌더된다 — 무변경 이관에서 가장 위험한 실수다. */

export type InputVariant = NonNullable<VariantProps<typeof inputVariants>["variant"]>;
export type SelectFieldVariant = NonNullable<VariantProps<typeof selectField>["variant"]>;
export type TextareaVariant = NonNullable<VariantProps<typeof textareaVariants>["variant"]>;
export type LabelVariant = NonNullable<VariantProps<typeof labelVariants>["variant"]>;

/** Input 전용 variant 축. `mono`는 사업자등록번호 필드에만 쓴다. */
export type InputVariantProps = { variant: InputVariant; mono?: boolean };
export type TextareaVariantProps = { variant: TextareaVariant };
export type LabelVariantProps = { variant: LabelVariant };

/* ─────────────── 표에 넣지 않은 예외 (전부 그대로 둔다) ───────────────
   CashflowScreen:228  <input type="file" className="hidden"> — 앱 유일의 비제어 컨트롤.
   CashflowScreen:226  <label>이 primary Button 문자열을 입고 있다 — Button 표 소관.
   CashflowScreen:244  기초 잔액 w-36 px-3 py-2, 링 없음 — 3축 동시 일탈.
   CashflowScreen:255  시트 선택 px-2 py-1, bg-white·cursor-pointer 없음.
   CashflowScreen:321  열 역할 select — bare `border` + 4분기 ${tone}이 색을 공급.
   SimulatorScreen:61  <input type="range" className="w-full accent-[#6E62C2]"> — UA 렌더.
   (여섯 곳 모두 현재 소스에서 다시 확인했다 — Stage 3·Anchor 어느 쪽도 이관하지 않았다.) */
