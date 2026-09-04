// lib/engine/format.ts — 날짜·표시 포맷 유틸 (순수 TS, React·DB 의존 금지)
// 저장·비교·정렬은 ISO("YYYY-MM-DD"), 표시만 점 표기("YYYY.MM.DD") — PRD §4.5-16

export const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

const pad2 = (n: number) => String(n).padStart(2, "0");

/** "YYYY.MM.DD" → 로컬 자정 Date. 형식이 아니면 null */
export function parseDate(s: string): Date | null {
  const m = s.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Date → "YYYY.MM.DD" (표시용) */
export function fmtDate(d: Date): string {
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`;
}

/** Date → "YYYY-MM-DD" (로컬 기준 ISO 날짜) */
export function toIso(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** "YYYY-MM-DD" → 로컬 자정 Date. 형식이 아니면 null */
export function fromIso(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** "YYYY.MM.DD" → "YYYY-MM-DD". 형식이 아니면 null */
export function dotToIso(s: string): string | null {
  const d = parseDate(s.trim());
  return d ? toIso(d) : null;
}

/** "YYYY-MM-DD" → "YYYY.MM.DD". 형식이 아니면 원문 반환 */
export function isoToDot(s: string): string {
  const d = fromIso(s);
  return d ? fmtDate(d) : s;
}

/** 시각을 버리고 로컬 자정으로 맞춘 새 Date */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  const r = startOfDay(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** 말일 클램프 포함 개월 가감 (1/31 + 1개월 = 2/28) */
export function addMonths(d: Date, n: number): Date {
  const day = d.getDate();
  const r = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const lastDay = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(day, lastDay));
  return r;
}

/** 2/29 → 평년 2/28 클램프 포함 연 가감 */
export function addYears(d: Date, n: number): Date {
  return addMonths(d, n * 12);
}

/** 해당 월의 마지막 날 */
export function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** 자정 기준 일수 차 (target − today). 음수 = 지남 */
export function dDay(target: Date, today: Date): number {
  return Math.round((startOfDay(target).getTime() - startOfDay(today).getTime()) / 86_400_000);
}

/** from → to 사이의 만(滿) 개월 수 (내림). to가 from보다 앞이면 0 */
export function monthsBetween(from: Date, to: Date): number {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(0, months);
}

/** 만 나이 (오늘 기준). 생년월일 형식 오류 시 null */
export function ageYears(birthIso: string, today: Date): number | null {
  const b = fromIso(birthIso);
  if (!b) return null;
  return Math.floor(monthsBetween(b, today) / 12);
}

/** 개월 수 → "3년" · "6개월" · "2년 11개월" (§6.1·§6.2 메시지용) */
export function fmtMonths(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m}개월`;
  if (m === 0) return `${y}년`;
  return `${y}년 ${m}개월`;
}

/** 업력 표기: 12개월 미만이면 "N개월", 그 외 "N년" (§4.5-23 허용된 문구 변경) */
export function fmtBusinessAge(ageMonths: number): string {
  return ageMonths < 12 ? `${ageMonths}개월` : `${Math.floor(ageMonths / 12)}년`;
}

/** "YYYY-MM-DD" → "YYYY.MM" (창업 시점 표기 등) */
export function fmtYearMonth(d: Date): string {
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}`;
}

// ─── 시드 상대 날짜 토큰 (§10.0 · 부록 C) ───────────────────────────────────

const RELATIVE_TOKEN = /^([+-])(?:(\d+)y)?(?:(\d+)m)?(?:(\d+)d)?$/;

/**
 * 시드의 날짜 필드를 ISO로 해석한다.
 * ISO("YYYY-MM-DD")는 그대로 통과, 상대 토큰("+27d" · "-35m5d" · "-39y4m")은 today 기준으로 변환.
 * 두 형식 모두 아니면 throw (§10.0 — 잘못된 토큰은 조용히 넘기지 않는다).
 */
export function resolveDate(token: string, today: Date): string {
  const s = token.trim();
  if (fromIso(s)) return s;

  const m = s.match(RELATIVE_TOKEN);
  if (!m) throw new Error(`상대 날짜 토큰 형식이 아닙니다: "${token}"`);

  const [, sign, y, mo, d] = m;
  if (y === undefined && mo === undefined && d === undefined) {
    throw new Error(`상대 날짜 토큰에 기간이 없습니다: "${token}"`);
  }

  const k = sign === "-" ? -1 : 1;
  let result = startOfDay(today);
  if (y !== undefined) result = addYears(result, k * Number(y));
  if (mo !== undefined) result = addMonths(result, k * Number(mo));
  if (d !== undefined) result = addDays(result, k * Number(d));
  return toIso(result);
}
