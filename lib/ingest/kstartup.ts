// lib/ingest/kstartup.ts — K-Startup 공고 수집 (공공데이터포털 15125364) · §7.3
// 공식 오픈 API만 호출한다. 누리집 HTML을 긁지 않는다 (§0.1-5).

import { announcementDetailUrl } from "@/lib/sourceLinks";

import {
  decodeEntities,
  mapKstartupField,
  structuredConditions,
  text,
  textOrNull,
  yyyymmddToIso,
  type RawAnnouncement,
} from "./normalize";

const ENDPOINT = "https://apis.data.go.kr/B552735/kisedKstartupService01/getAnnouncementInformation01";
const PER_PAGE = 100;
const PAGE_DELAY_MS = 300; // 초당 제한(코드 23)을 피한다

export function isKstartupEnabled(): boolean {
  return Boolean(process.env.DATA_GO_KR_SERVICE_KEY);
}

interface KstartupRow {
  pbanc_sn?: number | string;
  biz_pbanc_nm?: string;
  pbanc_ntrp_nm?: string;
  sprv_inst?: string;
  supt_biz_clsfc?: string;
  supt_regin?: string;
  aply_trgt?: string;
  aply_trgt_ctnt?: string;
  aply_excl_trgt_ctnt?: string;
  biz_enyy?: string;
  biz_trgt_age?: string;
  pbanc_rcpt_bgng_dt?: string;
  pbanc_rcpt_end_dt?: string;
  pbanc_ctnt?: string;
  detl_pg_url?: string;
  biz_aply_url?: string;
}

interface KstartupResponse {
  currentCount?: number;
  matchCount?: number;
  totalCount?: number;
  data?: KstartupRow[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** §7.3의 raw_text 템플릿 — 파싱 입력이 되므로 필드 이름을 그대로 남긴다 */
function buildRawText(row: KstartupRow): string {
  const start = yyyymmddToIso(row.pbanc_rcpt_bgng_dt) ?? "-";
  const end = yyyymmddToIso(row.pbanc_rcpt_end_dt) ?? "-";
  return [
    `[공고명] ${text(row.biz_pbanc_nm)}`,
    `[공고기관] ${text(row.pbanc_ntrp_nm)} / [주관기관 유형] ${text(row.sprv_inst)}`,
    `[지원분야] ${text(row.supt_biz_clsfc)}`,
    `[지역] ${text(row.supt_regin)}`,
    `[신청대상] ${text(row.aply_trgt)}`,
    `[대상 상세] ${text(row.aply_trgt_ctnt)}`,
    `[제외 대상] ${text(row.aply_excl_trgt_ctnt)}`,
    `[업력] ${text(row.biz_enyy)}`,
    `[대표자 연령] ${text(row.biz_trgt_age)}`,
    `[접수기간] ${start} ~ ${end}`,
    "[내용]",
    decodeEntities(text(row.pbanc_ctnt)),
  ].join("\n");
}

/**
 * API의 detl_pg_url에는 공고 번호가 빠져 있어(schM=view 까지만) 목록으로만 떨어진다.
 * pbanc_sn으로 상세 링크를 직접 만든다.
 */
function detailUrl(row: KstartupRow): string | null {
  const sn = textOrNull(row.pbanc_sn);
  const given = textOrNull(row.detl_pg_url);
  if (given && /pbancSn=\d+/.test(given)) return given;
  return announcementDetailUrl("kstartup", sn) ?? given;
}

function normalizeRow(row: KstartupRow): RawAnnouncement | null {
  const sourceId = textOrNull(row.pbanc_sn);
  const title = textOrNull(row.biz_pbanc_nm);
  if (!sourceId || !title) return null;

  const applyEnd = yyyymmddToIso(row.pbanc_rcpt_end_dt);
  return {
    source: "kstartup",
    source_id: sourceId,
    title,
    organization: text(row.pbanc_ntrp_nm, "미기재"),
    // sprv_inst는 기관명이 아니라 기관 "유형"이므로 executing_org로 쓰지 않는다 (§7.3)
    executing_org: null,
    support_field_hint: mapKstartupField(textOrNull(row.supt_biz_clsfc)),
    apply_start: yyyymmddToIso(row.pbanc_rcpt_bgng_dt),
    apply_end: applyEnd,
    is_rolling: applyEnd === null,
    original_url: detailUrl(row),
    apply_url: textOrNull(row.biz_aply_url),
    raw_text: buildRawText(row),
    region_hint: textOrNull(row.supt_regin),
    published_at: null,
    // 업력·대표자연령·지역은 API가 열거형으로 주므로 코드가 직접 조건을 만든다
    structured_conditions: structuredConditions({
      bizEnyy: textOrNull(row.biz_enyy),
      targetAge: textOrNull(row.biz_trgt_age),
      region: textOrNull(row.supt_regin),
    }),
    attachment_url: null, // K-Startup 응답에는 첨부파일 직링크가 없다
  };
}

export interface KstartupOptions {
  maxFetch?: number;
  /** 지역 문자열로 거른다. cond[supt_regin::LIKE]가 서버에서 안 먹는 경우가 있어 수집기 쪽에서 다시 거른다 (§7.3) */
  region?: string;
  onlyOpen?: boolean;
}

export async function fetchKstartup(options: KstartupOptions = {}): Promise<RawAnnouncement[]> {
  const key = process.env.DATA_GO_KR_SERVICE_KEY;
  if (!key) throw new Error("DATA_GO_KR_SERVICE_KEY가 없습니다.");

  const maxFetch = options.maxFetch ?? 100;
  const out: RawAnnouncement[] = [];

  for (let page = 1; out.length < maxFetch; page += 1) {
    const url = new URL(ENDPOINT);
    // Decoding 키를 URLSearchParams에 넣는다. _ENCODED 키를 쓰면 이중 인코딩으로 403(코드 30)이 난다 (§2.3)
    url.searchParams.set("serviceKey", key);
    url.searchParams.set("page", String(page));
    url.searchParams.set("perPage", String(PER_PAGE));
    url.searchParams.set("returnType", "json");
    if (options.onlyOpen !== false) url.searchParams.set("cond[rcrt_prgs_yn::EQ]", "Y");

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`K-Startup 응답 오류 ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as KstartupResponse;
    const rows = json.data ?? [];
    if (rows.length === 0) break;

    for (const row of rows) {
      const normalized = normalizeRow(row);
      if (!normalized) continue;
      if (options.region && !(normalized.region_hint ?? "").includes(options.region)) continue;
      out.push(normalized);
      if (out.length >= maxFetch) break;
    }

    if (rows.length < PER_PAGE) break;
    await sleep(PAGE_DELAY_MS);
  }

  return out;
}
