"use client";

// 브릿지 툴팁. Radix 동작(포털·지연·키보드 포커스 노출·aria-describedby)은 생성물 그대로다.
//
// 겉모습 기준: 검정 말풍선 대신 브랜드 계열 짙은 보라 말풍선. 흰 글자와의 대비는 8:1대라
// 본문 대비 기준을 넉넉히 넘는다. 꼬리표는 생성물의 회전 사각형 방식을 유지하되 색만 맞춘다
// (이 방식은 붙임 간격 0을 전제로 만들어져 있어 간격을 건드리면 꼬리가 떨어진다).
//
// 지연 시간을 0에서 200ms로 올렸다 — 0이면 포인터가 스쳐 지나가기만 해도 말풍선이 튀어나온다.
//
// ⚠ 앱 전체를 <TooltipProvider>로 한 번 감싸야 한다. 이 파일은 감싸지 않는다(app/layout.tsx는 다른 담당).
//
// 주석에 유틸리티 이름을 그대로 적지 않는다(스캐너가 주석도 후보로 읽는다).

import * as React from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function TooltipProvider({
  delayDuration = 200,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          // 날짜·숫자는 앱 규칙대로 고정폭 글꼴 — 말풍선 안 <time>과 단축키 표기에 자동 적용.
          "z-50 inline-flex w-fit max-w-xs origin-(--radix-tooltip-content-transform-origin) items-center gap-1.5 rounded-lg bg-brand-700 px-2.5 py-1.5 text-xs leading-relaxed text-white shadow-lg shadow-brand-900/25 [&_time]:font-mono has-data-[slot=kbd]:pr-1.5 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-sm **:data-[slot=kbd]:font-mono data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-brand-700 fill-brand-700" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
