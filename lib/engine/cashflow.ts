// lib/engine/cashflow.ts — 현금흐름표 집계 (순수 TS)
// 엑셀에서 읽은 2차원 배열을 거래 행으로 정규화하고 월별로 집계한다. 계산은 전부 여기(브라우저)에서 끝난다.
// AI에는 이 집계 결과(숫자)만 보낸다 — 개별 거래·거래처명은 보내지 않는다.

export interface CashRow {
  month: string; // "YYYY-MM"
  category: string;
  amount: number; // +수입 / −지출
}

export interface MonthAgg {
  month: string;
  inflow: number;
  outflow: number; // 양수
  net: number;
  cumulative: number;
}

export interface TopItem {
  category: string;
  amount: number;
  share: number; // 0~1
}

export interface CashflowSummary {
  months: MonthAgg[];
  totalInflow: number;
  totalOutflow: number;
  avgMonthlyInflow: number;
  avgMonthlyOutflow: number;
  avgMonthlyNet: number;
  latestNet: number;
  momNetChange: number | null; // 최근 달 순현금 − 전월
  burnRate: number | null; // 월평균 순유출 (양수). 순현금이 양수면 null
  runwayMonths: number | null; // endingBalance / burnRate
  endingBalance: number; // 기초잔액 + 누적 순현금
  topExpenses: TopItem[];
  topIncomes: TopItem[];
  rowCount: number;
  span: { from: string; to: string };
  flags: string[];
}

export type Layout = "date_kind_category_amount" | "date_category_in_out" | "date_category_signed" | "period_columns";

export interface ParseResult {
  rows: CashRow[];
  errors: string[];
  layout: Layout | null;
  skipped: number;
  /** 잔액 열을 지정했을 때 첫 거래 행에서 역산한 기초 잔액 (없으면 null) */
  inferredOpeningBalance?: number | null;
}

// ─── 셀 값 파싱 ───────────────────────────────────────────────────────────────

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase().replace(/\s+/g, "");

const DATE_HEADERS = ["날짜", "일자", "거래일", "거래일자", "date", "월", "기간", "연월"];
const CATEGORY_HEADERS = ["항목", "내용", "적요", "계정", "계정과목", "category", "item", "구분항목", "비목"];
const KIND_HEADERS = ["구분", "수입/지출", "수입지출", "유형", "type", "kind"];
const AMOUNT_HEADERS = ["금액", "amount", "합계", "액수"];
const IN_HEADERS = ["수입", "입금", "매출", "수입액", "입금액", "income", "inflow", "revenue"];
const OUT_HEADERS = ["지출", "출금", "비용", "지출액", "출금액", "expense", "outflow", "cost"];

const IN_WORDS = /수입|입금|매출|income|in$/i;
const OUT_WORDS = /지출|출금|비용|expense|out$/i;

function findCol(header: unknown[], names: string[]): number {
  const h = header.map(norm);
  for (const n of names) {
    const i = h.findIndex((x) => x === norm(n));
    if (i >= 0) return i;
  }
  for (const n of names) {
    const i = h.findIndex((x) => x.includes(norm(n)));
    if (i >= 0) return i;
  }
  return -1;
}

/** 엑셀 날짜 일련번호(1900 기준) → UTC Date */
export function excelSerialToDate(serial: number): Date {
  return new Date(Math.round((serial - 25569) * 86_400_000));
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** 다양한 표기 → "YYYY-MM". 못 읽으면 null */
export function toMonthKey(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : `${v.getUTCFullYear()}-${pad2(v.getUTCMonth() + 1)}`;
  if (typeof v === "number") {
    if (v > 20_000 && v < 80_000) {
      const d = excelSerialToDate(v);
      return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
    }
    if (v >= 190_001 && v <= 210_012) return `${Math.floor(v / 100)}-${pad2(v % 100)}`; // 202601
    return null;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})[.\-/년\s]+(\d{1,2})(?:[.\-/월\s]+(\d{1,2}))?/);
  if (m) return `${m[1]}-${pad2(Number(m[2]))}`;
  m = s.match(/^(\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})$/); // 26.01.15
  if (m) return `20${m[1]}-${pad2(Number(m[2]))}`;
  m = s.match(/^(\d{4})(\d{2})(\d{2})?$/); // 20260115 · 202601
  if (m) return `${m[1]}-${m[2]}`;
  return null;
}

/** "1,200,000원" · "(300,000)" · "-300000" · "₩1,000" → 숫자 */
export function toAmount(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v).trim().replace(/[₩원,\s]/g, "");
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith("-")) {
    neg = !neg;
    s = s.slice(1);
  }
  if (s.startsWith("+")) s = s.slice(1);
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return neg ? -n : n;
}

// ─── 표 → 거래 행 ──────────────────────────────────────────────────────────────

function isBlankRow(r: unknown[]): boolean {
  return r.every((c) => c === null || c === undefined || String(c).trim() === "");
}

/** 헤더 행을 찾는다 (처음 10행 안에서 날짜 열이 있는 첫 행) */
function findHeaderRow(rows: unknown[][]): number {
  const limit = Math.min(rows.length, 10);
  for (let i = 0; i < limit; i += 1) {
    if (findCol(rows[i] ?? [], DATE_HEADERS) >= 0) return i;
  }
  return -1;
}

export function parseCashTable(rows: unknown[][]): ParseResult {
  const errors: string[] = [];
  const hi = findHeaderRow(rows);
  if (hi < 0) {
    return { rows: [], errors: ["날짜(일자·거래일·월) 열이 있는 헤더 행을 찾지 못했습니다. 첫 행에 열 이름을 넣어 주세요."], layout: null, skipped: 0 };
  }
  const header = rows[hi];
  const dateCol = findCol(header, DATE_HEADERS);
  const categoryCol = findCol(header, CATEGORY_HEADERS);
  const kindCol = findCol(header, KIND_HEADERS);
  const amountCol = findCol(header, AMOUNT_HEADERS);
  const inCol = findCol(header, IN_HEADERS);
  const outCol = findCol(header, OUT_HEADERS);

  let layout: Layout;
  if (inCol >= 0 && outCol >= 0 && inCol !== outCol) layout = "date_category_in_out";
  else if (kindCol >= 0 && amountCol >= 0) layout = "date_kind_category_amount";
  else if (amountCol >= 0) layout = "date_category_signed";
  else {
    return {
      rows: [], layout: null, skipped: 0,
      errors: ["금액 열을 찾지 못했습니다. [금액] 열 하나(수입은 +, 지출은 −) 또는 [수입]·[지출] 두 열이 필요합니다."],
    };
  }

  const out: CashRow[] = [];
  let skipped = 0;
  for (let i = hi + 1; i < rows.length; i += 1) {
    const r = rows[i] ?? [];
    if (isBlankRow(r)) continue;
    const month = toMonthKey(r[dateCol]);
    if (!month) {
      skipped += 1;
      continue;
    }
    const category = String(r[categoryCol] ?? "").trim() || "미분류";

    if (layout === "date_category_in_out") {
      const inc = toAmount(r[inCol]);
      const exp = toAmount(r[outCol]);
      if (inc !== null && inc !== 0) out.push({ month, category, amount: Math.abs(inc) });
      if (exp !== null && exp !== 0) out.push({ month, category, amount: -Math.abs(exp) });
      if ((inc === null || inc === 0) && (exp === null || exp === 0)) skipped += 1;
      continue;
    }

    const amt = toAmount(r[amountCol]);
    if (amt === null) {
      skipped += 1;
      continue;
    }
    if (layout === "date_kind_category_amount") {
      const kind = String(r[kindCol] ?? "");
      if (OUT_WORDS.test(kind)) out.push({ month, category, amount: -Math.abs(amt) });
      else if (IN_WORDS.test(kind)) out.push({ month, category, amount: Math.abs(amt) });
      else out.push({ month, category, amount: amt }); // 구분을 못 읽으면 부호를 믿는다
    } else {
      out.push({ month, category, amount: amt });
    }
  }

  if (out.length === 0) errors.push("읽을 수 있는 거래 행이 없습니다. 날짜와 금액 형식을 확인해 주세요.");
  if (skipped > 0) errors.push(`${skipped}행은 날짜나 금액을 읽지 못해 건너뛰었습니다.`);
  return { rows: out, errors, layout, skipped };
}

// ─── 집계 ─────────────────────────────────────────────────────────────────────

function topItems(rows: CashRow[], sign: 1 | -1, n = 5): TopItem[] {
  const by = new Map<string, number>();
  for (const r of rows) {
    if (Math.sign(r.amount) !== sign) continue;
    by.set(r.category, (by.get(r.category) ?? 0) + Math.abs(r.amount));
  }
  const total = [...by.values()].reduce((a, b) => a + b, 0);
  return [...by.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([category, amount]) => ({ category, amount, share: total > 0 ? amount / total : 0 }));
}

const round = (n: number) => Math.round(n);

export function analyzeCashflow(rows: CashRow[], openingBalance = 0): CashflowSummary {
  const byMonth = new Map<string, { inflow: number; outflow: number }>();
  for (const r of rows) {
    const m = byMonth.get(r.month) ?? { inflow: 0, outflow: 0 };
    if (r.amount >= 0) m.inflow += r.amount;
    else m.outflow += -r.amount;
    byMonth.set(r.month, m);
  }
  const keys = [...byMonth.keys()].sort();
  let cumulative = openingBalance;
  const months: MonthAgg[] = keys.map((month) => {
    const m = byMonth.get(month)!;
    const net = m.inflow - m.outflow;
    cumulative += net;
    return { month, inflow: round(m.inflow), outflow: round(m.outflow), net: round(net), cumulative: round(cumulative) };
  });

  const n = Math.max(months.length, 1);
  const totalInflow = months.reduce((a, m) => a + m.inflow, 0);
  const totalOutflow = months.reduce((a, m) => a + m.outflow, 0);
  const avgMonthlyNet = (totalInflow - totalOutflow) / n;
  const latest = months[months.length - 1];
  const prev = months.length >= 2 ? months[months.length - 2] : null;
  const endingBalance = latest ? latest.cumulative : openingBalance;

  // 번레이트: 최근 3개월 평균 순유출 (양수). 순현금이 양수면 null
  const recent = months.slice(-3);
  const recentNet = recent.reduce((a, m) => a + m.net, 0) / Math.max(recent.length, 1);
  const burnRate = recentNet < 0 ? round(-recentNet) : null;
  const runwayMonths = burnRate !== null && endingBalance > 0 ? Math.round((endingBalance / burnRate) * 10) / 10 : null;

  const topExpenses = topItems(rows, -1);
  const topIncomes = topItems(rows, 1);

  const flags: string[] = [];
  if (runwayMonths !== null && runwayMonths < 6) flags.push(`런웨이 ${runwayMonths}개월 — 6개월 미만`);
  if (burnRate !== null && endingBalance <= 0) flags.push("기말 잔액이 0 이하이면서 순유출 지속");
  if (topExpenses[0] && topExpenses[0].share >= 0.5) flags.push(`지출의 ${Math.round(topExpenses[0].share * 100)}%가 '${topExpenses[0].category}' 한 항목`);
  if (topIncomes[0] && topIncomes[0].share >= 0.8 && topIncomes.length > 1) flags.push(`수입의 ${Math.round(topIncomes[0].share * 100)}%가 '${topIncomes[0].category}' 한 곳에 집중`);
  if (prev && latest && latest.net < prev.net && latest.net < 0) flags.push("최근 달 순현금이 전월보다 나빠짐");
  const negMonths = months.filter((m) => m.net < 0).length;
  if (months.length >= 3 && negMonths >= Math.ceil(months.length * 0.75)) flags.push(`${months.length}개월 중 ${negMonths}개월 순유출`);
  if (months.length >= 3 && negMonths === 0) flags.push("전 기간 순유입 유지");

  return {
    months,
    totalInflow: round(totalInflow),
    totalOutflow: round(totalOutflow),
    avgMonthlyInflow: round(totalInflow / n),
    avgMonthlyOutflow: round(totalOutflow / n),
    avgMonthlyNet: round(avgMonthlyNet),
    latestNet: latest?.net ?? 0,
    momNetChange: prev && latest ? latest.net - prev.net : null,
    burnRate,
    runwayMonths,
    endingBalance: round(endingBalance),
    topExpenses,
    topIncomes,
    rowCount: rows.length,
    span: { from: keys[0] ?? "-", to: keys[keys.length - 1] ?? "-" },
    flags,
  };
}

// ─── 수동 열 지정 (자동 인식이 안 맞는 형식용) ─────────────────────────────
//
// 실제 현금흐름표 양식을 참고했다 (비즈폼·예스폼 현금출납장/월간 현금흐름표, 디캠프·삼정KPMG 스타트업 자료).
//  · 현금출납장(세로): 일자 · 적요/계정과목 · 입금 · 출금 · 잔액 (· 증빙 · 비고)
//  · 가계부형(세로): 날짜를 행으로, 매출·급여·임차료… 항목을 열로 (수입/지출 열이 여러 개)
//  · 월간 현금흐름표(가로): 항목을 행으로, 1월~12월을 열로. "현금유입/현금유출" 소제목 행 아래 항목이 이어지고
//    합계·순현금·기초/기말 현금 행이 섞여 있다.
// 어느 양식이든 사용자가 열의 역할을 고르면 그 셀을 코드가 그대로 읽는다. AI는 숫자를 만지지 않는다.

export type ColumnRole =
  | "ignore"
  | "date" // 거래일·월 (세로표)
  | "category" // 항목·적요·계정과목
  | "kind" // 구분: 수입/지출 표기 열
  | "income" // 입금·매출 등 (여러 열 가능 — 열 이름이 항목이 된다)
  | "expense" // 출금·비용 등 (여러 열 가능)
  | "signed" // 한 열에 +수입/−지출 (드묾)
  | "balance" // 잔액 — 기초 잔액 추정에만 사용
  | "period"; // 가로표의 월 열

export type Orientation = "rows" | "columns";

export interface ManualMapping {
  orientation: Orientation;
  /** 열 이름이 있는 행. 세로표는 그 다음 행부터 데이터, 가로표는 이 행의 셀이 기간 라벨 */
  headerRowIndex: number;
  roles: ColumnRole[]; // 열 인덱스별
  /** "1월"처럼 연도 없는 기간 라벨에 붙일 연도 (기본: 표 안에서 찾은 연도 → 올해) */
  baseYear?: number;
}

// 열 이름으로 수입/지출을 짐작할 때 쓰는 단어 (실제 양식의 항목명)
export const HEADER_IN = /수입|입금|매출|판매|지원금|보조금|이자수입|투자유치|차입|유입|income|inflow|revenue|sales/i;
export const HEADER_OUT = /지출|출금|비용|급여|인건비|임차|임대료|관리비|공과금|광고|마케팅|재료|매입|외주|세금|보험|상환|이자비용|수수료|유출|expense|outflow|cost/i;
const HEADER_BALANCE = /잔액|잔고|balance/i;
const HEADER_DATE = /날짜|일자|연월일|거래일|월|기간|date/i;
const HEADER_CATEGORY = /항목|적요|내용|계정|계정과목|비목|구분항목|category|item|memo/i;
const HEADER_KIND = /^(구분|유형|수입\/지출|수입지출|type|kind)$/i;
// 가로표에서 소제목·합계 행
const SECTION_IN = /^(현금\s*)?(유입|수입|입금)(\s*(계|합계|내역|항목))?$|^영업활동.*유입|^i\.?\s*(현금)?유입/i;
const SECTION_OUT = /^(현금\s*)?(유출|지출|출금)(\s*(계|합계|내역|항목))?$|^영업활동.*유출|^ii\.?\s*(현금)?유출/i;
const TOTAL_RE = /합계|소계|총계|순현금|순증감|순유입|순유출|기초|기말|잔액|누계|현금흐름|net\s*cash|total/i;

/** "1월"·"'26.3"·"2026-03" 등 기간 라벨 → "YYYY-MM" */
export function monthFromLabel(v: unknown, baseYear: number): string | null {
  const direct = toMonthKey(v);
  if (direct) return direct;
  const s = String(v ?? "").trim();
  let m = s.match(/^(\d{1,2})\s*월$/);
  if (m) return `${baseYear}-${pad2(Number(m[1]))}`;
  m = s.match(/^'?(\d{2})[.\-/년\s]+(\d{1,2})월?$/); // '26.3 · 26년 3월
  if (m) return `20${m[1]}-${pad2(Number(m[2]))}`;
  return null;
}

/** 표 앞부분(제목·헤더)에서 4자리 연도를 찾는다. 없으면 올해 */
export function detectBaseYear(rows: unknown[][], upto = 3, fallback = new Date().getFullYear()): number {
  for (let i = 0; i < Math.min(rows.length, upto); i += 1) {
    for (const c of rows[i] ?? []) {
      const m = String(c ?? "").match(/(20\d{2})\s*년?/);
      if (m) return Number(m[1]);
    }
  }
  return fallback;
}

const cell = (r: unknown[], i: number) => String(r?.[i] ?? "").trim();
const headerName = (header: unknown[] | undefined, c: number, fallback: string) => (header ? cell(header, c) || fallback : fallback);

export function parseCashTableManual(rows: unknown[][], m: ManualMapping): ParseResult {
  const roles = m.roles;
  const idx = (role: ColumnRole) => roles.indexOf(role);
  const all = (role: ColumnRole) => roles.map((r, i) => (r === role ? i : -1)).filter((i) => i >= 0);
  const header = rows[m.headerRowIndex] ?? [];
  const baseYear = m.baseYear ?? detectBaseYear(rows);
  const out: CashRow[] = [];
  const errors: string[] = [];
  let skipped = 0;
  let inferredOpeningBalance: number | null = null;

  if (m.orientation === "rows") {
    const dateCol = idx("date");
    const categoryCol = idx("category");
    const kindCol = idx("kind");
    const balanceCol = idx("balance");
    const incomeCols = all("income");
    const expenseCols = all("expense");
    const signedCols = all("signed");
    if (dateCol < 0) return { rows: [], errors: ["날짜 열을 지정해 주세요."], layout: null, skipped: 0 };
    if (incomeCols.length + expenseCols.length + signedCols.length === 0) {
      return { rows: [], errors: ["금액 열을 하나 이상 지정해 주세요 — [수입]·[지출] 또는 [±금액]."], layout: null, skipped: 0 };
    }

    for (let i = m.headerRowIndex + 1; i < rows.length; i += 1) {
      const r = rows[i] ?? [];
      if (isBlankRow(r)) continue;
      const month = toMonthKey(r[dateCol]);
      if (!month) { skipped += 1; continue; }
      const baseCategory = categoryCol >= 0 ? cell(r, categoryCol) || null : null;
      const before = out.length;

      for (const c of incomeCols) {
        const amt = toAmount(r[c]);
        if (amt !== null && amt !== 0) out.push({ month, category: baseCategory ?? headerName(header, c, "수입"), amount: Math.abs(amt) });
      }
      for (const c of expenseCols) {
        const amt = toAmount(r[c]);
        if (amt !== null && amt !== 0) out.push({ month, category: baseCategory ?? headerName(header, c, "지출"), amount: -Math.abs(amt) });
      }
      for (const c of signedCols) {
        const amt = toAmount(r[c]);
        if (amt === null || amt === 0) continue;
        const category = baseCategory ?? headerName(header, c, "미분류");
        const kind = kindCol >= 0 ? cell(r, kindCol) : "";
        if (OUT_WORDS.test(kind)) out.push({ month, category, amount: -Math.abs(amt) });
        else if (IN_WORDS.test(kind)) out.push({ month, category, amount: Math.abs(amt) });
        else out.push({ month, category, amount: amt });
      }

      if (out.length === before) { skipped += 1; continue; }
      if (balanceCol >= 0 && inferredOpeningBalance === null) {
        const bal = toAmount(r[balanceCol]);
        if (bal !== null) {
          const net = out.slice(before).reduce((a, x) => a + x.amount, 0);
          inferredOpeningBalance = Math.round(bal - net);
        }
      }
    }

    const layout: Layout = signedCols.length > 0 && incomeCols.length + expenseCols.length === 0
      ? (kindCol >= 0 ? "date_kind_category_amount" : "date_category_signed")
      : "date_category_in_out";
    if (out.length === 0) errors.push("지정한 열에서 읽을 수 있는 거래가 없습니다. 열 지정과 데이터 시작 행을 확인해 주세요.");
    if (skipped > 0) errors.push(`${skipped}행은 날짜나 금액을 읽지 못해 건너뛰었습니다.`);
    return { rows: out, errors, layout, skipped, inferredOpeningBalance };
  }

  // ── 가로표: 열 = 기간, 행 = 항목 ────────────────────────────────────────
  const periodCols = all("period");
  const categoryCol = idx("category");
  const kindCol = idx("kind");
  if (periodCols.length === 0) return { rows: [], errors: ["기간(월) 열을 하나 이상 지정해 주세요."], layout: null, skipped: 0 };
  if (categoryCol < 0) return { rows: [], errors: ["항목 열을 지정해 주세요."], layout: null, skipped: 0 };

  const periods = periodCols.map((c) => ({ c, month: monthFromLabel(header[c], baseYear) }));
  const badPeriods = periods.filter((p) => !p.month).length;
  if (badPeriods > 0) errors.push(`기간 열 ${badPeriods}개의 이름을 월로 읽지 못해 건너뛰었습니다 (예: "1월", "2026-01").`);
  const usable = periods.filter((p): p is { c: number; month: string } => Boolean(p.month));
  if (usable.length === 0) return { rows: [], errors, layout: null, skipped: 0 };

  let sectionKind: "income" | "expense" | null = null;
  let ambiguous = 0;
  for (let i = m.headerRowIndex + 1; i < rows.length; i += 1) {
    const r = rows[i] ?? [];
    if (isBlankRow(r)) continue;
    const category = cell(r, categoryCol);
    const amounts = usable.map((p) => toAmount(r[p.c]));
    const hasNumber = amounts.some((a) => a !== null && a !== 0);

    if (!hasNumber) {
      if (SECTION_IN.test(category)) sectionKind = "income";
      else if (SECTION_OUT.test(category)) sectionKind = "expense";
      continue; // 소제목·빈 행
    }
    if (!category || TOTAL_RE.test(category)) { skipped += 1; continue; } // 합계·기초/기말 행은 이중 계산이 되므로 건너뛴다

    let kind: "income" | "expense" | null = null;
    if (kindCol >= 0) {
      const k = cell(r, kindCol);
      kind = OUT_WORDS.test(k) ? "expense" : IN_WORDS.test(k) ? "income" : null;
    }
    kind ??= sectionKind;
    if (!kind) {
      // 부호로 알 수 있으면 쓴다. 양수만 있는데 구분이 없으면 추측하지 않는다.
      const signs = new Set(amounts.filter((a): a is number => a !== null && a !== 0).map((a) => Math.sign(a)));
      if (signs.size === 1 && signs.has(-1)) kind = "expense";
      else { ambiguous += 1; skipped += 1; continue; }
    }
    usable.forEach((p, j) => {
      const a = amounts[j];
      if (a === null || a === 0) return;
      out.push({ month: p.month, category, amount: kind === "expense" ? -Math.abs(a) : Math.abs(a) });
    });
  }
  if (ambiguous > 0) errors.push(`${ambiguous}개 항목은 수입인지 지출인지 알 수 없어 건너뛰었습니다. [구분] 열을 지정하거나 표에 "수입"/"지출" 소제목 행을 두세요.`);
  if (out.length === 0) errors.push("지정한 열에서 읽을 수 있는 거래가 없습니다. 항목·기간 열과 데이터 시작 행을 확인해 주세요.");
  else if (skipped - ambiguous > 0) errors.push(`합계·잔액 등 ${skipped - ambiguous}개 행은 이중 계산을 피해 건너뛰었습니다.`);
  return { rows: out, errors, layout: "period_columns", skipped, inferredOpeningBalance: null };
}

export interface ColumnGuess {
  orientation: Orientation;
  headerRowIndex: number;
  roles: ColumnRole[];
}

/**
 * 열 역할 추측 — AI가 아니라 셀 값의 형태(날짜/숫자/문자 비율)와 열 이름 단어만 본다.
 * 사용자가 확인·수정한 뒤에만 쓰인다.
 */
export function guessColumnRoles(rows: unknown[][], headerRowIndex = 0): ColumnGuess {
  const header = rows[headerRowIndex] ?? [];
  const colCount = Math.max(0, ...rows.map((r) => (r ?? []).length));
  const baseYear = detectBaseYear(rows);
  const roles: ColumnRole[] = Array.from({ length: colCount }, () => "ignore");

  // 가로표인가: 헤더 셀 3개 이상이 월로 읽히면
  const periodCols = Array.from({ length: colCount }, (_, c) => c).filter((c) => monthFromLabel(header[c], baseYear) !== null);
  if (periodCols.length >= 3) {
    for (const c of periodCols) roles[c] = "period";
    const rest = Array.from({ length: colCount }, (_, c) => c).filter((c) => !periodCols.includes(c));
    const textiness = (c: number) => {
      const vals = rows.slice(headerRowIndex + 1, headerRowIndex + 21).map((r) => r?.[c]).filter((v) => v !== null && v !== undefined && v !== "");
      return vals.length ? vals.filter((v) => toAmount(v) === null && !toMonthKey(v)).length / vals.length : 0;
    };
    // 구분(수입/지출) 열은 이름이 아니라 값으로 판단한다 — 실제 양식은 항목 열 이름을 "구분"이라 쓰기도 한다
    const kindness = (c: number) => {
      const vals = rows.slice(headerRowIndex + 1, headerRowIndex + 21).map((r) => cell(r ?? [], c)).filter(Boolean);
      return vals.length ? vals.filter((v) => IN_WORDS.test(v) || OUT_WORDS.test(v)).length / vals.length : 0;
    };
    const textCols = rest.filter((c) => textiness(c) > 0.5).sort((a, b) => textiness(b) - textiness(a));
    const kindCol = textCols.length >= 2 ? textCols.find((c) => kindness(c) >= 0.6) : undefined;
    if (kindCol !== undefined) roles[kindCol] = "kind";
    const cat = textCols.find((c) => c !== kindCol);
    if (cat !== undefined) roles[cat] = "category";
    return { orientation: "columns", headerRowIndex, roles };
  }

  // 세로표
  const sample = rows.slice(headerRowIndex + 1, headerRowIndex + 21).filter((r) => !isBlankRow(r ?? []));
  const score = (c: number) => {
    let d = 0, n = 0, t = 0, total = 0;
    for (const r of sample) {
      const v = r[c];
      if (v === null || v === undefined || v === "") continue;
      total += 1;
      if (toMonthKey(v)) d += 1;
      else if (toAmount(v) !== null) n += 1;
      else t += 1;
    }
    return total ? { d: d / total, n: n / total, t: t / total } : { d: 0, n: 0, t: 0 };
  };
  const scores = Array.from({ length: colCount }, (_, c) => score(c));

  // 날짜: 이름이 날짜스럽거나 값이 날짜로 읽히는 열
  let dateCol = scores.findIndex((sc, c) => sc.d > 0.5 && HEADER_DATE.test(cell(header, c)));
  if (dateCol < 0) dateCol = scores.reduce((best, sc, c) => (sc.d > 0.5 && (best < 0 || sc.d > scores[best].d) ? c : best), -1);
  if (dateCol >= 0) roles[dateCol] = "date";

  for (let c = 0; c < colCount; c += 1) {
    if (c === dateCol) continue;
    const name = cell(header, c);
    const sc = scores[c];
    if (sc.n > 0.5) {
      if (HEADER_BALANCE.test(name)) roles[c] = "balance";
      else if (HEADER_IN.test(name) && !HEADER_OUT.test(name)) roles[c] = "income";
      else if (HEADER_OUT.test(name)) roles[c] = "expense";
      else if (/금액|amount/i.test(name)) roles[c] = "signed";
    } else if (sc.t > 0.5) {
      if (HEADER_KIND.test(name)) roles[c] = "kind";
      else if (HEADER_CATEGORY.test(name) && !roles.includes("category")) roles[c] = "category";
    }
  }
  // 이름으로 못 정한 숫자 열이 딱 하나면 ±금액으로, 문자 열이 하나면 항목으로
  const numericUnassigned = scores.map((sc, c) => (sc.n > 0.5 && roles[c] === "ignore" ? c : -1)).filter((c) => c >= 0);
  if (numericUnassigned.length === 1 && !roles.some((r) => r === "income" || r === "expense" || r === "signed")) roles[numericUnassigned[0]] = "signed";
  if (!roles.includes("category")) {
    const textCols = scores.map((sc, c) => (sc.t > 0.5 && roles[c] === "ignore" ? c : -1)).filter((c) => c >= 0);
    if (textCols.length === 1) roles[textCols[0]] = "category";
  }
  return { orientation: "rows", headerRowIndex, roles };
}
