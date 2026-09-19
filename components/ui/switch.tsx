"use client";

// 비즈버디 스위치. MyPageScreen:270-273의 손수 만든 토글(알약 트랙 + 절대배치 손잡이)과
// 같은 모양으로 맞춘다 — 갈아 끼웠을 때 달라지는 건 동작(스페이스바·폼 참여)과
// 접근성(role=switch·aria-checked)뿐이다.
//
// 원본 문자열(MyPageScreen:271-272):
//   트랙   w-10 h-6 rounded-full transition-all cursor-pointer relative shrink-0
//          켜짐 bg-[#6E62C2] / 꺼짐 bg-[#D0D3DA]
//   손잡이 absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all
//          켜짐 left-5 / 꺼짐 left-1
// 손잡이를 transform으로 옮기지 않고 원본대로 left를 움직인다 — transition-all이 둘 다 덮지만
// 값이 4px/20px로 딱 떨어져 있어 그대로 두는 쪽이 검증하기 쉽다.
//
// 색은 globals.css가 비즈버디 값으로 연결해 둔 시맨틱 토큰을 쓴다(bg-primary=#6E62C2 ·
// ring-ring=#6E62C2). #D0D3DA는 대응 토큰 이름이 테두리 두께 유틸리티와 헷갈려서 값 그대로 적는다.
// 다크 모드 코드 없음 — 이 앱은 다크 모드를 지원하지 않는다.

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "relative w-10 h-6 shrink-0 rounded-full bg-[#D0D3DA] transition-all cursor-pointer",
        "data-checked:bg-primary",
        // 네이티브에 없던 층: 키보드 포커스만 링을 켠다(마우스 클릭 모양은 지금과 동일).
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="absolute top-1 left-1 block size-4 rounded-full bg-white shadow transition-all data-checked:left-5"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
