"use client";

// 화면 하단 공통 고지 한 줄 (§8). S1·S3·S4·S5·S6·S7·S9에 표시한다.

import Link from "next/link";

import { fmtDate } from "@/lib/engine/format";
import { useToday } from "@/lib/store/today";

export function Disclaimer() {
  const today = useToday();
  return (
    <p className="text-[10px] text-[#888888]">
      본 정보는 참고용이며 법적 자문이 아닙니다 · 판정 기준일 {fmtDate(today)} ·{" "}
      <Link href="/about" className="hover:text-[#6E62C2] hover:underline">
        데이터 출처·면책 보기
      </Link>
    </p>
  );
}
