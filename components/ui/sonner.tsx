"use client";

// 비즈버디 토스트. 이 앱에 없던 UI라 전부 새로 칠한다.
//
// next-themes 의존은 걷어냈다 — 이 앱은 다크 모드가 없어 theme는 light 고정이다.
// (`npx shadcn add sonner`가 package.json에 next-themes를 넣어 뒀는데, 이제 저장소 안에서
//  이 패키지를 import하는 곳이 하나도 없다. 지우는 건 package.json 담당이 할 일.)
//
// 왜 색을 CSS 변수로 넘기는가: sonner는 자기 스타일시트를 런타임에 <head> 끝으로 주입하는데,
// 그 규칙들이 [data-sonner-toast][data-styled='true'] 처럼 속성 선택자를 두 개씩 쓴다.
// 유틸리티 클래스 하나(선택자 1개)로는 특이도에서 지고, 우리 스타일시트가 먼저 실려서
// 같은 특이도여도 진다. 그래서
//   · sonner가 읽어 주는 변수가 있는 것(배경·글자·테두리·반경)은 인라인 style로 넘기고,
//   · 변수가 없는 것(그림자·글꼴 굵기·버튼 색)만 important 유틸리티로 덮는다.
// 아이콘 색은 우리가 넘긴 <svg>에 직접 붙으므로 아무것과도 싸우지 않는다.

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/* 패널은 어떤 종류든 흰색이다 — 종류는 아이콘 색으로만 구분한다.
   아래 4색 묶음은 호출부가 richColors를 켰을 때만 쓰이는 예비값이고,
   값은 전부 앱에 이미 있는 것이다(성공 = Alert success · 경고 = amber-50/200/700 ·
   오류 = rose-50/200/700 · 정보 = 브랜드 틴트). */
const TOAST_VARS = {
  "--normal-bg": "#FFFFFF",
  "--normal-text": "#111111",
  "--normal-border": "#E4E6EA",
  "--border-radius": "0.75rem", // rounded-xl 12px — 앱에서 가장 많이 쓰는 반경
  "--success-bg": "#EEF4F0",
  "--success-border": "#B2D1BF",
  "--success-text": "#2A5A46",
  "--warning-bg": "#FFFBEB",
  "--warning-border": "#FDE68A",
  "--warning-text": "#B45309",
  "--error-bg": "#FFF1F2",
  "--error-border": "#FECDD3",
  "--error-text": "#BE123C",
  "--info-bg": "#F0EEF9",
  "--info-border": "#DDDAF4",
  "--info-text": "#6E62C2",
} as React.CSSProperties;

const TOAST_CLASSNAMES = {
  // 글꼴은 sonner가 토스터 뿌리에만 걸어 두므로 토스트 쪽에서 덮으면 !가 필요 없다.
  // 그림자는 [data-styled] 규칙이 갖고 있어 !가 필요하다(Onboarding 드롭다운과 같은 shadow-lg).
  toast: "font-sans shadow-lg!",
  // 카드 행과 같은 조판: 제목 14px 굵게 + 설명 12px 회색.
  title: "text-sm font-semibold!",
  description: "text-xs text-muted-foreground!",
  actionButton:
    "bg-primary! text-primary-foreground! rounded-lg! px-3! font-semibold! hover:bg-brand-600!",
  cancelButton: "bg-muted! text-muted-foreground! rounded-lg! px-3! font-semibold!",
  closeButton:
    "bg-popover! border-border! text-muted-foreground! hover:bg-accent! hover:text-foreground!",
};

/* 종류별 강조는 아이콘 색 하나로만 준다. 전부 앱에 이미 쓰이는 색이다:
   성공 #3D7260(MyPage:196 성공 알림의 체크) · 경고 amber-700 · 오류 rose-700 · 정보 브랜드. */
const TOAST_ICONS = {
  success: <CircleCheckIcon className="size-4 text-[#3D7260]" />,
  info: <InfoIcon className="size-4 text-primary" />,
  warning: <TriangleAlertIcon className="size-4 text-amber-700" />,
  error: <OctagonXIcon className="size-4 text-rose-700" />,
  loading: <Loader2Icon className="size-4 animate-spin text-muted-foreground" />,
};

function Toaster({ icons, style, toastOptions, ...props }: ToasterProps) {
  return (
    <Sonner
      {...props}
      // 테마는 스프레드 뒤에 둬서 호출부가 덮을 수 없게 잠근다 — 이 앱에 다크 모드는 없다.
      theme="light"
      icons={{ ...TOAST_ICONS, ...icons }}
      style={{ ...TOAST_VARS, ...style }}
      toastOptions={{
        ...toastOptions,
        classNames: { ...TOAST_CLASSNAMES, ...toastOptions?.classNames },
      }}
    />
  );
}

export { Toaster };
