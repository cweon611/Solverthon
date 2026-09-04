// lib/sourceLinks.ts — 출처 포털의 공고 링크 생성 (순수 TS)
//
// 왜 필요한가: 카드의 "신청 바로가기 / 공고 원문 / 원문 보기"가 포털 첫 화면으로 떨어지면
// 사용자는 그 공고를 다시 찾아야 한다. 링크는 최소한 "공고 목록"까지는 데려가야 하고,
// 공고 식별자가 있으면 해당 공고 상세로 바로 보내야 한다.
//
// 아래 URL은 2026-09-03에 실제로 접속해 동작을 확인한 것이다. 추측한 주소는 넣지 않는다.
//   K-Startup 모집중 목록  https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do
//   K-Startup 마감 목록    https://www.k-startup.go.kr/web/contents/bizpbanc-deadline.do
//   K-Startup 공고 상세    .../bizpbanc-ongoing.do?schM=view&pbancSn={pbanc_sn}   ← API의 detl_pg_url과 같은 형식
//   기업마당 공고 목록      https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do
//   기업마당 공고 상세      https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId={pblancId}

import type { Program } from "@/lib/types";

export type ProgramSource = Program["source"];

interface Portal {
  label: string;
  listOngoing: string;
  listClosed: string;
  detail: (sourceId: string) => string;
}

const PORTALS: Partial<Record<ProgramSource, Portal>> = {
  kstartup: {
    label: "K-Startup",
    listOngoing: "https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do",
    listClosed: "https://www.k-startup.go.kr/web/contents/bizpbanc-deadline.do",
    detail: (id) => `https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do?schM=view&pbancSn=${encodeURIComponent(id)}`,
  },
  bizinfo: {
    label: "기업마당",
    listOngoing: "https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do",
    listClosed: "https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do",
    detail: (id) => `https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId=${encodeURIComponent(id)}`,
  },
};

export function portalLabel(source: ProgramSource): string | null {
  return PORTALS[source]?.label ?? null;
}

/** 출처 포털의 공고 목록. 사람이 직접 등록한 공고(local)·예약값(synthetic)은 포털이 없다 */
export function announcementListUrl(source: ProgramSource, closed = false): string | null {
  const portal = PORTALS[source];
  if (!portal) return null;
  return closed ? portal.listClosed : portal.listOngoing;
}

/**
 * 포털이 쓰는 공고 식별자의 형식.
 * 시드의 "SEED-01" 같은 가짜 id로 상세 링크를 만들면 포털이 "페이지를 찾을 수 없습니다"를 띄운다.
 * 형식이 다르면 상세 링크를 만들지 않고 목록으로 보낸다.
 */
const SOURCE_ID_PATTERN: Partial<Record<ProgramSource, RegExp>> = {
  kstartup: /^\d+$/, // pbanc_sn — 숫자만
  bizinfo: /^PBLN_\d+$/, // pblancId — PBLN_ + 숫자
};

/** 공고 식별자로 만드는 상세 페이지 링크. 식별자 형식이 포털과 다르면 null */
export function announcementDetailUrl(source: ProgramSource, sourceId: string | null): string | null {
  const portal = PORTALS[source];
  if (!portal || !sourceId) return null;
  const pattern = SOURCE_ID_PATTERN[source];
  if (pattern && !pattern.test(sourceId)) return null;
  return portal.detail(sourceId);
}

/**
 * 첫 화면(홈)으로만 데려가는 링크인지. 이런 URL은 "공고 원문"으로 쓰지 않는다.
 * 예: https://www.k-startup.go.kr · https://www.bizinfo.go.kr/ · https://www.k-startup.go.kr/web
 */
export function isBareHomepage(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.search || parsed.hash) return false;
  const path = parsed.pathname.replace(/\/+$/, "");
  return path === "" || path === "/web" || path === "/index.do" || path === "/main";
}

/**
 * 카드에서 열 "공고 원문" 링크를 고른다. 우선순위:
 *   1. 수집된 원문 URL (단, 포털 첫 화면이면 버린다)
 *   2. 공고 식별자로 만든 상세 페이지
 *   3. 출처 포털의 공고 목록
 *   4. 없음 → 버튼 비활성 (§4.5-8)
 */
export function resolveOriginalUrl(
  p: Pick<Program, "source" | "source_id" | "original_url"> & { is_synthetic?: boolean },
  closed = false,
): string | null {
  if (p.original_url && !isBareHomepage(p.original_url)) return p.original_url;
  // 시연용 합성 데이터에는 대응하는 실제 공고가 없다. 상세 링크를 만들면 포털이 오류를 낸다.
  const detail = p.is_synthetic ? null : announcementDetailUrl(p.source, p.source_id);
  return detail ?? announcementListUrl(p.source, closed);
}

/** "신청 바로가기" 링크. 신청 URL이 없으면 원문 링크로 대체한다 */
export function resolveApplyUrl(
  p: Pick<Program, "source" | "source_id" | "original_url" | "apply_url"> & { is_synthetic?: boolean },
  closed = false,
): string | null {
  if (p.apply_url && !isBareHomepage(p.apply_url)) return p.apply_url;
  return resolveOriginalUrl(p, closed);
}
