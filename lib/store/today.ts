"use client";

// lib/store/today.ts — 클라이언트 "오늘" 날짜 (§4.5-3)
// 서버 렌더에는 서버 시각이, 하이드레이션 이후에는 브라우저 시각이 쓰인다.
// 앱 셸이 마운트 전에는 스켈레톤만 그리므로(§4.3) 서버 값은 화면에 나오지 않는다.

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

let clientToday: Date | null = null;
const serverToday = new Date();

function getClientToday(): Date {
  if (!clientToday) clientToday = new Date();
  return clientToday;
}
function getServerToday(): Date {
  return serverToday;
}

/** 화면 전체가 같은 "오늘"을 쓰도록 마운트 시 1회 고정된 Date */
export function useToday(): Date {
  return useSyncExternalStore(noopSubscribe, getClientToday, getServerToday);
}
