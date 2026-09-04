// lib/ingest/normalize.ts — 수집 어댑터 공통 정규화 (§7.3)
// 공식 오픈 API 응답만 다룬다. HTML 스크래핑은 하지 않는다 (§0.1-5).

import { REGIONS } from "@/lib/constants";
import type { Condition, SupportField } from "@/lib/types";

/**
 * 공공 API가 구조화해서 주는 필드는 AI에게 맡기지 않고 코드가 직접 조건으로 만든다 (§3.1).
 * K-Startup은 업력·대표자연령·지역을 열거형으로 주므로 추측이 필요 없다.
 */

/** "예비창업자,1년미만,3년미만,7년미만" → 가장 넉넉한 상한을 개월로 (없으면 null) */
export function parseBizEnyy(raw: string | null): number | null {
  if (!raw) return null;
  const years = [...decodeEntities(raw).matchAll(/(\d+)\s*년\s*미만/g)].map((m) => Number(m[1]));
  if (years.length === 0) return null;
  return Math.max(...years) * 12;
}

/** "만 20세 이상 ~ 만 39세 이하,만 40세 이상" → 상한 나이 (40세 이상이 포함되면 제한 없음) */
export function parseTargetAge(raw: string | null): number | null {
  if (!raw) return null;
  const s = decodeEntities(raw);
  if (/만\s*40\s*세\s*이상/.test(s)) return null; // 상한 없음
  const ages = [...s.matchAll(/만\s*(\d+)\s*세\s*이하/g)].map((m) => Number(m[1]));
  return ages.length > 0 ? Math.max(...ages) : null;
}

/** "전남광주" · "서울" → 시도 코드 배열. "전국"이면 null(조건 없음) */
export function parseRegions(raw: string | null): string[] | null {
  if (!raw) return null;
  const s = decodeEntities(raw);
  if (/전국/.test(s)) return null;
  const codes = REGIONS.filter((r) => s.includes(r.short)).map((r) => r.code);
  return codes.length > 0 ? [...new Set(codes)] : null;
}

/** 구조화 필드에서 만든 결정론적 조건들 */
export function structuredConditions(input: {
  bizEnyy?: string | null;
  targetAge?: string | null;
  region?: string | null;
}): Condition[] {
  const out: Condition[] = [];

  const months = parseBizEnyy(input.bizEnyy ?? null);
  if (months !== null) {
    out.push({
      field: "business_age_months", op: "lt", value: months,
      label: `업력 ${months / 12}년 미만`,
      source_text: `[업력] ${decodeEntities(input.bizEnyy ?? "")}`,
    });
  }

  const age = parseTargetAge(input.targetAge ?? null);
  if (age !== null) {
    out.push({
      field: "ceo_age", op: "lte", value: age,
      label: `대표자 만 ${age}세 이하`,
      source_text: `[대표자 연령] ${decodeEntities(input.targetAge ?? "")}`,
    });
  }

  const regions = parseRegions(input.region ?? null);
  if (regions !== null) {
    const names = REGIONS.filter((r) => regions.includes(r.code)).map((r) => r.short).join("·");
    out.push({
      field: "region_code", op: "in", value: regions,
      label: `${names} 소재 기업`,
      source_text: `[지역] ${decodeEntities(input.region ?? "")}`,
    });
  }

  return out;
}

/** 어댑터가 공통으로 뱉는 형태 */
export interface RawAnnouncement {
  source: "kstartup" | "bizinfo";
  source_id: string;
  title: string;
  organization: string;
  executing_org: string | null;
  support_field_hint: SupportField;
  apply_start: string | null;
  apply_end: string | null;
  is_rolling: boolean;
  original_url: string | null;
  apply_url: string | null;
  raw_text: string;
  region_hint: string | null;
  published_at: string | null;
  /** API의 구조화 필드에서 코드가 직접 만든 조건 (AI 추출과 병합된다) */
  structured_conditions: Condition[];
  /** 공식 API JSON이 직접 준 첨부파일(hwpx·pdf) 링크. 파싱 단계에서 본문을 뽑는다. 없거나 미지원 형식이면 null */
  attachment_url: string | null;
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'", "&nbsp;": " ",
};

/** 공공 API 응답에는 &amp; 같은 엔티티가 그대로 섞여 온다 */
export function decodeEntities(s: string): string {
  return s.replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (m) => ENTITIES[m] ?? m);
}

/** 기업마당 bsnsSumryCn은 HTML을 담고 있다. 서버에서 태그를 제거한다 (§13.4) */
export function stripHtml(s: string): string {
  return decodeEntities(
    s
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]*>/g, ""),
  )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** "20261013" → "2026-10-13". 형식이 아니면 null */
export function yyyymmddToIso(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${y}-${mo}-${d}`;
}

export function textOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = decodeEntities(String(v)).trim();
  return s.length === 0 || s === "null" ? null : s;
}

export function text(v: unknown, fallback = ""): string {
  return textOrNull(v) ?? fallback;
}

/**
 * K-Startup의 supt_biz_clsfc를 분야로 옮긴다 (§7.3).
 * 첫 수집 후 실제 값 분포를 보고 표를 보완한다.
 */
export function mapKstartupField(raw: string | null): SupportField {
  const s = decodeEntities(raw ?? "");
  if (/기술개발|R&D/i.test(s)) return "R&D";
  if (/판로|해외|수출|글로벌/.test(s)) return "수출";
  if (/인력|고용|채용/.test(s)) return "고용";
  if (/융자|보증|투자|금융/.test(s)) return "금융";
  if (/사업화|창업|교육|멘토링|시설|공간/.test(s)) return "창업";
  return "기타";
}

/** 기업마당 pldirSportRealmLclasCodeNm → 분야 (§7.3) */
export function mapBizinfoField(raw: string | null): SupportField {
  const s = decodeEntities(raw ?? "").trim();
  const table: Record<string, SupportField> = {
    금융: "금융", 기술: "R&D", 인력: "고용", 수출: "수출",
    내수: "내수", 창업: "창업", 경영: "경영", 기타: "기타",
  };
  for (const [key, value] of Object.entries(table)) {
    if (s.includes(key)) return value;
  }
  return "기타";
}

/**
 * 기업마당 reqstBeginEndDe: "2026-09-01 ~ 2026-10-02" (실측) 또는 "20260901 ~ 20261002".
 * 못 읽으면 null → 상시로 본다.
 */
export function parsePeriod(s: string | null): { start: string | null; end: string | null } | null {
  if (!s) return null;
  const t = decodeEntities(s);
  let m = t.match(/(\d{4})-(\d{2})-(\d{2})\s*~\s*(\d{4})-(\d{2})-(\d{2})/);
  if (m) return { start: `${m[1]}-${m[2]}-${m[3]}`, end: `${m[4]}-${m[5]}-${m[6]}` };
  m = t.match(/(\d{8})\s*~\s*(\d{8})/);
  if (m) return { start: yyyymmddToIso(m[1]), end: yyyymmddToIso(m[2]) };
  return null;
}

/**
 * 기업마당 공고명은 "[경기] …", "[전남] …"처럼 시도 접두로 지역을 표시한다 (실측).
 * 접두가 코드표의 시도면 그 코드를, "[전국]"이거나 없으면 null.
 */
export function parseTitleRegion(title: string): string | null {
  const m = title.trim().match(/^\[([^\]]{2,8})\]/);
  if (!m) return null;
  const tag = m[1].trim();
  const hit = REGIONS.find((r) => tag === r.short || tag === r.label || r.label.startsWith(tag));
  return hit?.code ?? null;
}

/** 접수기간 문자열이 상시를 뜻하는지 */
export function looksRolling(s: string | null): boolean {
  if (!s) return true;
  return /상시|수시|예산\s*소진|연중/.test(s);
}
