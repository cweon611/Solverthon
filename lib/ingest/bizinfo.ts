// lib/ingest/bizinfo.ts — 기업마당 지원사업정보 수집 · §7.3
// BIZINFO_API_KEY가 없으면 자동 비활성이다.
//
// 실측(2026-09-03): 응답은 { jsonArray: [...] }. reqstBeginEndDe는 "2026-09-01 ~ 2026-10-02" 형식.
// pblancUrl은 selectSIIA200Detail.do?pblancId= 상세 링크(정상 열림). hashtags 필터는 서버에서 걸러주지 않는다.
// 공고명 "[경기] …" 시도 접두로 지역을 알 수 있어 코드가 지역 조건을 직접 만든다. searchCnt는 1000까지 동작.

import { XMLParser } from "fast-xml-parser";

import { announcementDetailUrl } from "@/lib/sourceLinks";

import { REGIONS } from "@/lib/constants";
import { isSupportedAttachment } from "@/lib/ingest/attachment";

import {
  looksRolling,
  mapBizinfoField,
  parsePeriod,
  parseTitleRegion,
  stripHtml,
  text,
  textOrNull,
  type RawAnnouncement,
} from "./normalize";

const ENDPOINT = "https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do";
const MAX_SEARCH_CNT = 1000;

export function isBizinfoEnabled(): boolean {
  return Boolean(process.env.BIZINFO_API_KEY);
}

interface BizinfoRow {
  pblancId?: string;
  pblancNm?: string;
  jrsdInsttNm?: string;
  excInsttNm?: string;
  reqstBeginEndDe?: string;
  pblancUrl?: string;
  rceptEngnHmpgUrl?: string;
  pldirSportRealmLclasCodeNm?: string;
  creatPnttm?: string;
  trgetNm?: string;
  reqstMthPapersCn?: string;
  bsnsSumryCn?: string;
  hashtags?: string;
  pldirSportRealmMlsfcCodeNm?: string;
  refrncNm?: string;
  printFileNm?: string;
  printFlpthNm?: string;
}

/**
 * printFlpthNm은 API가 JSON으로 직접 준 첨부파일 링크다(사람이 찾은 페이지 링크가 아니다).
 * hwpx·pdf만 지원한다 — 확장자가 다르면(대개 옛 이진 .hwp) null.
 */
function attachmentUrl(row: BizinfoRow): string | null {
  if (!isSupportedAttachment(textOrNull(row.printFileNm))) return null;
  return textOrNull(row.printFlpthNm);
}

function buildRawText(row: BizinfoRow): string {
  const regionCode = parseTitleRegion(text(row.pblancNm));
  const regionLabel = REGIONS.find((r) => r.code === regionCode)?.label ?? "전국 또는 미표기";
  return [
    `[공고명] ${text(row.pblancNm)}`,
    `[소관기관] ${text(row.jrsdInsttNm)} / [수행기관] ${text(row.excInsttNm)}`,
    `[지원분야] ${text(row.pldirSportRealmLclasCodeNm)}${row.pldirSportRealmMlsfcCodeNm ? ` > ${text(row.pldirSportRealmMlsfcCodeNm)}` : ""}`,
    `[지역] ${regionLabel}`,
    `[지원대상] ${text(row.trgetNm)}`,
    `[신청기간] ${text(row.reqstBeginEndDe)}`,
    `[신청방법] ${stripHtml(text(row.reqstMthPapersCn))}`,
    `[문의] ${text(row.refrncNm)}`,
    "[사업개요]",
    stripHtml(text(row.bsnsSumryCn)),
  ].join("\n");
}

function normalizeRow(row: BizinfoRow): RawAnnouncement | null {
  const sourceId = textOrNull(row.pblancId);
  const title = textOrNull(row.pblancNm);
  if (!sourceId || !title) return null;

  const period = textOrNull(row.reqstBeginEndDe);
  const parsed = parsePeriod(period);
  const applyStart = parsed?.start ?? null;
  const applyEnd = parsed?.end ?? null;
  // 기간을 못 읽거나 "상시"·"예산 소진"이면 상시 접수로 본다 (§7.3)
  const isRolling = !applyEnd || looksRolling(period);

  // 공고명 "[경기]" 같은 시도 접두 → 지역 조건 (코드가 만든다. AI 추측 아님)
  const regionCode = parseTitleRegion(title);
  const regionLabel = REGIONS.find((r) => r.code === regionCode)?.short ?? null;

  const givenUrl = textOrNull(row.pblancUrl);
  return {
    source: "bizinfo",
    source_id: sourceId,
    title,
    organization: text(row.jrsdInsttNm, "미기재"),
    executing_org: textOrNull(row.excInsttNm),
    support_field_hint: mapBizinfoField(textOrNull(row.pldirSportRealmLclasCodeNm)),
    apply_start: applyStart,
    apply_end: isRolling ? null : applyEnd,
    is_rolling: isRolling,
    original_url: givenUrl ?? announcementDetailUrl("bizinfo", sourceId),
    apply_url: textOrNull(row.rceptEngnHmpgUrl),
    raw_text: buildRawText(row),
    region_hint: regionLabel,
    published_at: textOrNull(row.creatPnttm),
    // 기업마당은 업력·연령 필드가 없다. 지역만 공고명 접두에서 만든다
    structured_conditions: regionCode
      ? [{ field: "region_code", op: "in", value: [regionCode], label: `${regionLabel} 소재 기업`, source_text: `[공고명] ${title}` }]
      : [],
    attachment_url: attachmentUrl(row),
  };
}

/** 응답에서 item 배열을 꺼낸다. jsonArray → item 중첩 구조를 방어적으로 훑는다 */
function extractRows(payload: unknown): BizinfoRow[] {
  const seen = new Set<unknown>();
  const walk = (node: unknown, depth: number): BizinfoRow[] => {
    if (!node || typeof node !== "object" || depth > 6 || seen.has(node)) return [];
    seen.add(node);
    if (Array.isArray(node)) {
      const rows = node.filter((n): n is BizinfoRow => Boolean(n) && typeof n === "object" && "pblancId" in n);
      if (rows.length > 0) return rows;
      return node.flatMap((n) => walk(n, depth + 1));
    }
    const obj = node as Record<string, unknown>;
    if ("pblancId" in obj) return [obj as BizinfoRow];
    return Object.values(obj).flatMap((v) => walk(v, depth + 1));
  };
  return walk(payload, 0);
}

export interface BizinfoOptions {
  maxFetch?: number;
  /** 지역 필터(시도 short, 예 "광주"). 서버 hashtags 필터가 동작하지 않아 수집기 쪽에서 공고명 접두로 거른다 */
  region?: string;
  /** 분야 코드 필터 (searchLclasId). 예: "01" 금융 */
  fieldCode?: string;
}

export async function fetchBizinfo(options: BizinfoOptions = {}): Promise<RawAnnouncement[]> {
  const key = process.env.BIZINFO_API_KEY;
  if (!key) throw new Error("BIZINFO_API_KEY가 없습니다.");

  const maxFetch = options.maxFetch ?? 100;
  const params = new URLSearchParams({
    crtfcKey: key,
    dataType: "json",
    // 지역으로 거를 때는 넉넉히 받아 온 뒤 잘라낸다
    searchCnt: String(Math.min(options.region ? MAX_SEARCH_CNT : maxFetch, MAX_SEARCH_CNT)),
  });
  if (options.fieldCode) params.set("searchLclasId", options.fieldCode);

  const res = await fetch(`${ENDPOINT}?${params}`, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`기업마당 응답 오류 ${res.status}: ${body.slice(0, 200)}`);
  }

  const body = await res.text();
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    // 문서의 JSON 예시가 비표준 표기라 파싱에 실패할 수 있다 → RSS(XML)로 다시 받아 파싱 (§7.3)
    const xmlParams = new URLSearchParams(params);
    xmlParams.set("dataType", "rss");
    const xmlRes = await fetch(`${ENDPOINT}?${xmlParams}`, { cache: "no-store" });
    if (!xmlRes.ok) throw new Error(`기업마당 XML 폴백 실패 ${xmlRes.status}`);
    payload = new XMLParser({ ignoreAttributes: false, trimValues: true }).parse(await xmlRes.text());
  }

  const rows = extractRows(payload).map(normalizeRow).filter((r): r is RawAnnouncement => r !== null);
  const filtered = options.region ? rows.filter((r) => r.region_hint === options.region) : rows;
  return filtered.slice(0, maxFetch);
}
