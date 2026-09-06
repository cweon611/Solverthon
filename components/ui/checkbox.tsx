"use client";

// 브릿지 체크박스. TasksScreen:92-95의 손수 만든 <button> 체크박스와 같은 모양으로 맞춘다 —
// 갈아 끼웠을 때 달라지는 건 동작(스페이스바·폼 참여)과 접근성(role=checkbox·aria-checked)뿐이고
// 보이는 그림은 그대로다.
//
// 원본 문자열(TasksScreen:93):
//   w-5 h-5 rounded-lg border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all cursor-pointer
//   켜짐 bg-[#6E62C2] border-[#6E62C2] / 꺼짐 border-[#D0D3DA] hover:border-[#6E62C2]
// mt-0.5는 그 호출부의 줄맞춤이라 컴포넌트에 넣지 않는다 — 필요한 쪽이 className으로 준다.
//
// 색은 globals.css가 브릿지 값으로 연결해 둔 시맨틱 토큰을 쓴다
// (bg-primary=#6E62C2 · ring-ring=#6E62C2). #D0D3DA는 대응 토큰 이름이 테두리 두께
// 유틸리티와 헷갈려서 값 그대로 적는다.
// 다크 모드 코드 없음 — 이 앱은 다크 모드를 지원하지 않는다.

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "size-5 shrink-0 flex items-center justify-center rounded-lg border-2 border-[#D0D3DA] transition-all cursor-pointer",
        "hover:border-primary",
        "data-checked:bg-primary data-checked:border-primary",
        // 네이티브에 없던 층: 키보드 포커스만 링을 켠다(마우스 클릭 모양은 지금과 동일).
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {/* 원본과 같은 글리프. lucide 아이콘으로 바꾸면 획 굵기·크기가 달라진다. */}
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="text-primary-foreground text-[10px] font-bold"
      >
        ✓
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
