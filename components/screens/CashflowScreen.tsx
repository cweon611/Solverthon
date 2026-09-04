"use client";

// 현금흐름 분석 — 엑셀을 브라우저에서 읽고 집계한다. 파일과 개별 거래는 서버로 가지 않는다.
// AI에는 월별 합계·상위 항목 같은 집계 숫자만 보내 "사장 입장의 해설"을 받는다. 숫자 계산은 전부 코드가 한다.
//
// 형식이 다르면 사용자가 열의 역할을 직접 고른다(수동 지정). 실제 양식(현금출납장·가계부형·월간 현금흐름표 가로표)을
// 참고해 역할을 정했다. 지정한 뒤부터는 코드가 그 셀을 그대로 읽는다 — AI는 이 화면 어디에서도 숫자를 읽지 않는다.

import { useMemo, useState, type ChangeEvent } from "react";

import type { CashflowInsight } from "@/lib/ai/geminiSchemas";
import { downloadTemplate, readWorkbookAllSheets, type SheetData } from "@/lib/cashflow/readExcel";
import { SAMPLE_HEADER, SAMPLE_OPENING_BALANCE, SAMPLE_ROWS, SAMPLE_TABLE } from "@/lib/cashflow/sample";
import {
  analyzeCashflow,
  guessColumnRoles,
  parseCashTable,
  parseCashTableManual,
  type ColumnRole,
  type ManualMapping,
  type Orientation,
  type ParseResult,
} from "@/lib/engine/cashflow";

import { Disclaimer } from "@/components/ui/Disclaimer";

const fmtWon = (n: number): string => {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(abs >= 1_000_000_000 ? 0 : 1)}억원`;
  return `${sign}${Math.round(abs / 10_000).toLocaleString("ko-KR")}만원`;
};

const SEVERITY = {
  good: { label: "잘하고 있음", cls: "bg-[#EEF4F0] border-[#B2D1BF] text-[#2A5A46]", dot: "bg-[#3D7260]" },
  watch: { label: "지켜볼 것", cls: "bg-amber-50 border-amber-200 text-amber-800", dot: "bg-amber-500" },
  risk: { label: "위험", cls: "bg-rose-50 border-rose-200 text-rose-800", dot: "bg-rose-500" },
} as const;

type AiState = { status: "idle" } | { status: "loading" } | { status: "done"; data: CashflowInsight; model: string } | { status: "error"; message: string };

// ─── 수동 열 지정 ───────────────────────────────────────────────────────────
const ROLE_LABEL: Record<ColumnRole, string> = {
  ignore: "사용 안 함",
  date: "날짜 (거래일·월)",
  category: "항목 (적요·계정과목)",
  kind: "구분 (수입/지출 표기)",
  income: "수입 (입금·매출 …)",
  expense: "지출 (출금·비용 …)",
  balance: "잔액 (기초 잔액 추정용)",
  signed: "±금액 (한 열, 부호로 구분)",
  period: "기간 (월)",
};
const ROLES_ROWS: ColumnRole[] = ["ignore", "date", "category", "kind", "income", "expense", "balance", "signed"];
const ROLES_COLUMNS: ColumnRole[] = ["ignore", "period", "category", "kind"];
/** 열 하나에만 둘 수 있는 역할. 수입·지출·기간·±금액은 여러 열에 줄 수 있다 */
const SINGLE_ROLES = new Set<ColumnRole>(["date", "category", "kind", "balance"]);
const colLetter = (i: number): string => String.fromCharCode(65 + (i % 26));

function validateMapping(orientation: Orientation, roles: ColumnRole[], headerRowIndex: number): { mapping: ManualMapping | null; error: string | null } {
  const count = (r: ColumnRole) => roles.filter((x) => x === r).length;
  if (orientation === "rows") {
    if (count("date") === 0) return { mapping: null, error: "날짜 열을 지정해 주세요." };
    if (count("income") + count("expense") + count("signed") === 0) {
      return { mapping: null, error: "금액 열을 하나 이상 지정해 주세요 — [수입]·[지출] 여러 열도 됩니다." };
    }
  } else {
    if (count("period") === 0) return { mapping: null, error: "기간(월) 열을 하나 이상 지정해 주세요." };
    if (count("category") === 0) return { mapping: null, error: "항목 열을 지정해 주세요." };
  }
  return { mapping: { orientation, headerRowIndex, roles }, error: null };
}

export function CashflowScreen() {
  const [sheets, setSheets] = useState<SheetData[] | null>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [source, setSource] = useState<string>("");
  const [opening, setOpening] = useState<string>("0");
  const [fileError, setFileError] = useState<string | null>(null);
  const [ai, setAi] = useState<AiState>({ status: "idle" });

  const [manualOpenOverride, setManualOpenOverride] = useState<boolean | null>(null); // null = 자동(형식을 못 읽으면 스스로 펼침)
  const [orientation, setOrientation] = useState<Orientation>("rows");
  const [headerRow, setHeaderRow] = useState(0); // 0-based: 열 이름이 있는 행
  const [colRoles, setColRoles] = useState<ColumnRole[]>([]);
  const [manualMapping, setManualMapping] = useState<ManualMapping | null>(null);

  const table = sheets ? sheets[sheetIndex].rows : null;
  const colCount = table ? Math.min(Math.max(0, ...table.map((r) => (r ?? []).length)), 16) : 0;

  const auto = useMemo<ParseResult | null>(() => (table ? parseCashTable(table) : null), [table]);
  const manualParsed = useMemo<ParseResult | null>(
    () => (table && manualMapping ? parseCashTableManual(table, manualMapping) : null),
    [table, manualMapping],
  );
  const parsed = manualMapping ? manualParsed : auto;

  const summary = useMemo(() => {
    if (!parsed || parsed.rows.length === 0) return null;
    const ob = Number(String(opening).replace(/[^\d.-]/g, "")) || 0;
    return analyzeCashflow(parsed.rows, ob);
  }, [parsed, opening]);

  const mappingResult = useMemo(() => validateMapping(orientation, colRoles, headerRow), [orientation, colRoles, headerRow]);

  const reguess = (rows: unknown[][], hdr: number) => {
    const g = guessColumnRoles(rows, hdr);
    setOrientation(g.orientation);
    setColRoles(g.roles.slice(0, 16));
  };

  const resetForNewData = (nextSheets: SheetData[], idx: number) => {
    setSheets(nextSheets); setSheetIndex(idx);
    setManualMapping(null); setManualOpenOverride(null);
    setFileError(null); setAi({ status: "idle" });
    const rows = nextSheets[idx]?.rows ?? [];
    // 헤더 행 추정: 처음 5행 중 문자 셀이 가장 많은 행
    let hdr = 0, best = -1;
    for (let i = 0; i < Math.min(5, rows.length); i += 1) {
      const texts = (rows[i] ?? []).filter((v) => typeof v === "string" && v.trim() !== "").length;
      if (texts > best) { best = texts; hdr = i; }
    }
    setHeaderRow(hdr);
    reguess(rows, hdr);
  };

  // 형식을 자동으로 못 읽으면 지정 패널을 스스로 펼친다. 사용자가 접거나 펼치면 그 선택을 따른다
  const manualOpen = manualOpenOverride ?? (auto?.layout === null && !manualMapping);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const sheetData = await readWorkbookAllSheets(file);
      resetForNewData(sheetData, 0);
      setSource(file.name);
    } catch {
      setFileError("파일을 읽지 못했습니다. .xlsx / .xls / .csv 파일인지 확인해 주세요.");
    }
    e.target.value = "";
  };

  const onChangeSheet = (idx: number) => {
    if (!sheets) return;
    resetForNewData(sheets, idx);
  };

  const loadSample = () => {
    resetForNewData([{ name: "현금흐름", rows: SAMPLE_TABLE }], 0);
    setSource("시연용 샘플 (합성 데이터 · 12개월)");
    setOpening(String(SAMPLE_OPENING_BALANCE));
  };

  const changeHeaderRow = (next: number) => {
    if (!table) return;
    const hdr = Math.max(0, Math.min(next, table.length - 1));
    setHeaderRow(hdr);
    reguess(table, hdr);
  };

  const changeOrientation = (o: Orientation) => {
    setOrientation(o);
    // 방향이 바뀌면 그 방향에서 쓸 수 없는 역할은 비운다
    const allowed = o === "rows" ? ROLES_ROWS : ROLES_COLUMNS;
    setColRoles((prev) => prev.map((r) => (allowed.includes(r) ? r : "ignore")));
  };

  const setRole = (col: number, role: ColumnRole) =>
    setColRoles((prev) => {
      const next = [...prev];
      if (SINGLE_ROLES.has(role)) for (let i = 0; i < next.length; i += 1) if (next[i] === role) next[i] = "ignore";
      next[col] = role;
      return next;
    });

  const applyMapping = () => {
    if (mappingResult.mapping) setManualMapping(mappingResult.mapping);
  };

  const cancelManual = () => {
    setManualMapping(null);
    if (auto && auto.layout !== null) setManualOpenOverride(false);
  };

  const explain = async () => {
    if (!summary) return;
    setAi({ status: "loading" });
    try {
      const res = await fetch("/api/ai/cashflow", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message ?? `요청 실패 (${res.status})`);
      setAi({ status: "done", data: body.insight as CashflowInsight, model: body.usage?.model ?? "" });
    } catch (e) {
      setAi({ status: "error", message: e instanceof Error ? e.message : "알 수 없는 오류" });
    }
  };

  const maxBar = summary ? Math.max(...summary.months.map((m) => Math.max(m.inflow, m.outflow)), 1) : 1;
  const previewRows = table ? table.slice(headerRow, headerRow + 7) : [];
  const roleOptions = orientation === "rows" ? ROLES_ROWS : ROLES_COLUMNS;
  const roleCount = (r: ColumnRole) => colRoles.filter((x) => x === r).length;
  const inferred = manualParsed?.inferredOpeningBalance ?? null;
  const openingIsDefault = (Number(String(opening).replace(/[^\d.-]/g, "")) || 0) === 0;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold text-[#111111]">현금흐름 분석</h1>
        <p className="text-[#888888] text-sm mt-1">현금흐름표(엑셀)를 올리면 월별로 집계하고, 대표가 오늘 알아야 할 것을 AI가 풀어 설명합니다.</p>
      </div>

      {/* 입력 */}
      <div className="bg-white border border-[#E4E6EA] rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="px-4 py-2.5 rounded-xl bg-[#6E62C2] text-white text-sm font-semibold hover:bg-[#5a50a8] transition-colors cursor-pointer shadow-md shadow-[#6E62C2]/25">
            엑셀 파일 올리기
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFile} />
          </label>
          <button onClick={loadSample} className="px-4 py-2.5 rounded-xl text-sm font-medium text-[#6E62C2] bg-[#f0eef9] hover:bg-[#dddaf4] border border-[#dddaf4] transition-colors cursor-pointer">
            샘플로 보기
          </button>
          <button onClick={() => downloadTemplate([SAMPLE_HEADER, ...SAMPLE_ROWS.slice(0, 7)])} className="px-4 py-2.5 rounded-xl text-sm font-medium text-[#444444] bg-white hover:bg-[#F5F6F8] border border-[#E4E6EA] transition-colors cursor-pointer">
            템플릿 내려받기
          </button>
          <a href="/samples/cashflow-sample.xlsx" download="현금흐름표_예시_12개월.xlsx"
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-[#444444] bg-white hover:bg-[#F5F6F8] border border-[#E4E6EA] transition-colors cursor-pointer">
            예시 파일 내려받기 (12개월)
          </a>
          <div className="ml-auto flex items-center gap-2">
            <label className="text-xs text-[#888888]">기초 잔액(원)</label>
            <input value={opening} onChange={(e) => setOpening(e.target.value)} inputMode="numeric"
              className="w-36 border border-[#E4E6EA] rounded-xl px-3 py-2 text-sm font-mono text-[#111111] focus:outline-none focus:border-[#6E62C2]" />
          </div>
        </div>
        <div className="text-[11px] text-[#888888] leading-relaxed">
          <p>현금출납장(일자·적요·입금·출금·잔액), 가계부형(날짜 행 × 항목 열), 월간 현금흐름표(항목 행 × 월 열) 어느 양식이든 읽습니다. 흔한 열 이름은 자동으로 알아보고, 다르면 아래에서 직접 지정합니다.</p>
          <p className="mt-0.5">파일과 개별 거래 내역은 이 브라우저 안에서만 처리됩니다. AI에는 월별 합계와 상위 항목 같은 집계 숫자만 전송되며, 회사명·거래처명은 포함되지 않고 숫자를 AI가 직접 읽지도 않습니다.</p>
        </div>

        {sheets && sheets.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#888888]">시트</label>
            <select value={sheetIndex} onChange={(e) => onChangeSheet(Number(e.target.value))}
              className="border border-[#E4E6EA] rounded-lg px-2 py-1 text-xs text-[#111111] focus:outline-none focus:border-[#6E62C2]">
              {sheets.map((s, i) => <option key={s.name} value={i}>{s.name}</option>)}
            </select>
          </div>
        )}
        {source && <p className="text-xs text-[#444444]"><span className="font-semibold">불러온 데이터:</span> {source}</p>}
        {fileError && <p className="text-xs text-rose-700">{fileError}</p>}
        {parsed && parsed.errors.length > 0 && (
          <ul className="space-y-0.5">{parsed.errors.map((e, i) => <li key={i} className="text-xs text-amber-700">· {e}</li>)}</ul>
        )}
        {manualMapping && inferred !== null && openingIsDefault && (
          <button onClick={() => setOpening(String(inferred))}
            className="text-xs font-semibold text-[#6E62C2] bg-[#f0eef9] border border-[#dddaf4] px-3 py-1.5 rounded-lg hover:bg-[#dddaf4] cursor-pointer">
            잔액 열에서 역산한 기초 잔액 {inferred.toLocaleString("ko-KR")}원 적용
          </button>
        )}

        {table && (
          <div className="pt-2 border-t border-[#E4E6EA]">
            {!manualOpen ? (
              <button onClick={() => setManualOpenOverride(true)} className="text-xs font-semibold text-[#6E62C2] hover:underline cursor-pointer">
                {auto?.layout === null ? "형식을 알아보지 못했어요 — 직접 열을 지정하기 →" : "형식이 다른가요? 직접 열을 지정하기 →"}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#111111]">열 직접 지정하기</p>
                  <button onClick={() => setManualOpenOverride(false)} className="text-[11px] text-[#888888] hover:text-[#6E62C2] cursor-pointer">접기 ▴</button>
                </div>
                <p className="text-[11px] text-[#888888]">
                  각 열이 무엇인지 골라 주세요. 수입·지출 열은 여러 개 지정할 수 있고, 항목 열이 없으면 열 이름이 항목이 됩니다. 이후 계산은 지정한 셀만 그대로 읽습니다 — AI는 관여하지 않습니다.
                </p>

                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex gap-1 bg-[#F5F6F8] border border-[#E4E6EA] rounded-xl p-1">
                    {([["rows", "세로표 · 행이 거래/날짜"], ["columns", "가로표 · 열이 월"]] as const).map(([o, label]) => (
                      <button key={o} onClick={() => changeOrientation(o)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${orientation === o ? "bg-white text-[#111111] shadow-sm border border-[#E4E6EA]" : "text-[#888888] hover:text-[#444444]"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-[#888888]">열 이름 행</label>
                    <button onClick={() => changeHeaderRow(headerRow - 1)}
                      className="w-6 h-6 rounded border border-[#E4E6EA] text-[#444444] text-xs hover:bg-[#F5F6F8] cursor-pointer">−</button>
                    <span className="text-xs font-mono text-[#111111] w-16 text-center">{headerRow + 1}번째 줄</span>
                    <button onClick={() => changeHeaderRow(headerRow + 1)}
                      className="w-6 h-6 rounded border border-[#E4E6EA] text-[#444444] text-xs hover:bg-[#F5F6F8] cursor-pointer">+</button>
                    <span className="text-[10px] text-[#888888]">(제목 줄이 있으면 조정 · 그 다음 줄부터 데이터)</span>
                  </div>
                </div>

                <div className="overflow-x-auto border border-[#E4E6EA] rounded-xl">
                  <table className="text-[11px] min-w-full">
                    <thead>
                      <tr className="bg-[#F5F6F8]">
                        {Array.from({ length: colCount }, (_, c) => (
                          <th key={c} className="px-2 py-1.5 text-left font-mono text-[#888888] border-b border-[#E4E6EA] min-w-[128px]">{colLetter(c)}</th>
                        ))}
                      </tr>
                      <tr className="bg-white">
                        {Array.from({ length: colCount }, (_, c) => {
                          const role = colRoles[c] ?? "ignore";
                          const tone = role === "income" ? "border-[#B2D1BF] bg-[#EEF4F0]" : role === "expense" ? "border-rose-200 bg-rose-50" : role === "date" || role === "period" ? "border-[#dddaf4] bg-[#f0eef9]" : "border-[#E4E6EA] bg-white";
                          return (
                            <th key={c} className="px-2 py-1.5 border-b border-[#E4E6EA]">
                              <select value={role} onChange={(e) => setRole(c, e.target.value as ColumnRole)}
                                className={`w-full border rounded-md px-1.5 py-1 text-[11px] text-[#111111] focus:outline-none focus:border-[#6E62C2] ${tone}`}>
                                {roleOptions.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                              </select>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((r, ri) => (
                        <tr key={ri} className={ri === 0 ? "bg-[#FAFAFB] font-semibold" : ri % 2 === 0 ? "bg-white" : "bg-[#FAFAFB]"}>
                          {Array.from({ length: colCount }, (_, c) => (
                            <td key={c} className={`px-2 py-1 font-mono truncate max-w-[160px] border-b border-[#F5F6F8] ${ri === 0 ? "text-[#111111]" : "text-[#444444]"}`}>
                              {String((r ?? [])[c] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-[#888888]">
                  첫 줄(굵게)이 열 이름 행입니다. 지정됨: 날짜 {roleCount("date")} · 항목 {roleCount("category")} · 수입 {roleCount("income")} · 지출 {roleCount("expense")}
                  {orientation === "columns" ? ` · 기간 ${roleCount("period")}` : ""}{roleCount("signed") ? ` · ±금액 ${roleCount("signed")}` : ""}{roleCount("balance") ? " · 잔액 1" : ""}
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={applyMapping} disabled={!mappingResult.mapping}
                    className="px-3 py-1.5 rounded-lg bg-[#6E62C2] text-white text-xs font-semibold hover:bg-[#5a50a8] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                    이 지정으로 다시 읽기
                  </button>
                  {manualMapping && (
                    <button onClick={cancelManual} className="px-3 py-1.5 rounded-lg border border-[#E4E6EA] text-[#444444] text-xs font-semibold hover:bg-[#F5F6F8] cursor-pointer">
                      자동 인식으로 되돌리기
                    </button>
                  )}
                  {mappingResult.error && <span className="text-[11px] text-amber-700">{mappingResult.error}</span>}
                  {manualMapping && !mappingResult.error && <span className="text-[11px] text-[#2A5A46]">✓ 지정한 열로 읽는 중 · 거래 {manualParsed?.rows.length ?? 0}건</span>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {summary && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "기말 잔액", value: fmtWon(summary.endingBalance), sub: `${summary.span.from} ~ ${summary.span.to}`, tone: summary.endingBalance <= 0 ? "rose" : "default" },
              { label: "월평균 순현금", value: fmtWon(summary.avgMonthlyNet), sub: `수입 ${fmtWon(summary.avgMonthlyInflow)} · 지출 ${fmtWon(summary.avgMonthlyOutflow)}`, tone: summary.avgMonthlyNet < 0 ? "amber" : "green" },
              { label: "번레이트 (최근 3개월 순유출)", value: summary.burnRate === null ? "없음" : fmtWon(summary.burnRate), sub: summary.burnRate === null ? "순유입 상태" : "월 기준", tone: summary.burnRate === null ? "green" : "amber" },
              { label: "런웨이 (현금이 버티는 기간)", value: summary.runwayMonths === null ? "—" : `${summary.runwayMonths}개월`, sub: summary.runwayMonths === null ? "순유출이 없어 해당 없음" : summary.runwayMonths < 6 ? "6개월 미만" : "6개월 이상", tone: summary.runwayMonths !== null && summary.runwayMonths < 6 ? "rose" : "default" },
            ].map((k) => (
              <div key={k.label} className={`rounded-2xl border p-4 ${k.tone === "rose" ? "bg-rose-50 border-rose-200" : k.tone === "amber" ? "bg-amber-50 border-amber-200" : k.tone === "green" ? "bg-[#EEF4F0] border-[#B2D1BF]" : "bg-white border-[#E4E6EA]"}`}>
                <p className="text-[10px] text-[#888888] font-medium">{k.label}</p>
                <p className="text-xl font-bold font-mono text-[#111111] mt-1 leading-none">{k.value}</p>
                <p className="text-[10px] text-[#888888] mt-1.5">{k.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-[1fr_320px] gap-4">
            {/* 월별 */}
            <div className="bg-white border border-[#E4E6EA] rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-bold text-[#111111]">월별 수입·지출</h2>
                <span className="flex items-center gap-1 text-[10px] text-[#888888]"><span className="w-2 h-2 rounded-sm bg-[#6FA48E]" />수입</span>
                <span className="flex items-center gap-1 text-[10px] text-[#888888]"><span className="w-2 h-2 rounded-sm bg-rose-300" />지출</span>
              </div>
              <div className="space-y-2">
                {summary.months.map((m) => (
                  <div key={m.month} className="grid grid-cols-[52px_1fr_120px] items-center gap-3">
                    <span className="text-[11px] font-mono text-[#888888]">{m.month}</span>
                    <div className="space-y-0.5">
                      <div className="h-2 rounded bg-[#6FA48E]" style={{ width: `${(m.inflow / maxBar) * 100}%` }} />
                      <div className="h-2 rounded bg-rose-300" style={{ width: `${(m.outflow / maxBar) * 100}%` }} />
                    </div>
                    <div className="text-right">
                      <p className={`text-[11px] font-mono font-semibold ${m.net < 0 ? "text-rose-600" : "text-[#2A5A46]"}`}>{m.net >= 0 ? "+" : ""}{fmtWon(m.net)}</p>
                      <p className="text-[10px] font-mono text-[#888888]">잔액 {fmtWon(m.cumulative)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 상위 항목 + 신호 */}
            <div className="space-y-4">
              <div className="bg-white border border-[#E4E6EA] rounded-2xl p-5">
                <h2 className="text-sm font-bold text-[#111111] mb-3">지출 상위</h2>
                <div className="space-y-2">
                  {summary.topExpenses.map((t) => (
                    <div key={t.category}>
                      <div className="flex justify-between text-[11px]"><span className="text-[#444444]">{t.category}</span><span className="font-mono text-[#888888]">{fmtWon(t.amount)} · {Math.round(t.share * 100)}%</span></div>
                      <div className="h-1.5 rounded bg-[#F5F6F8] mt-1"><div className="h-full rounded bg-rose-300" style={{ width: `${t.share * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#F5F6F8] border border-[#E4E6EA] rounded-2xl p-5">
                <h2 className="text-sm font-bold text-[#111111] mb-2">코드가 감지한 신호</h2>
                {summary.flags.length === 0 ? <p className="text-xs text-[#888888]">특별한 신호 없음</p> : (
                  <ul className="space-y-1">{summary.flags.map((f, i) => <li key={i} className="text-xs text-[#444444]">· {f}</li>)}</ul>
                )}
              </div>
            </div>
          </div>

          {/* AI 해설 */}
          <div className="bg-white border border-[#E4E6EA] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-sm font-bold text-[#111111]">사장님을 위한 AI 해설</h2>
                <p className="text-[11px] text-[#888888] mt-0.5">위 집계 숫자만 AI에 보내 대표 입장에서 읽어 드립니다. 세무·법률 판단은 하지 않습니다.</p>
              </div>
              <button onClick={explain} disabled={ai.status === "loading"}
                className="px-4 py-2.5 rounded-xl bg-[#6E62C2] text-white text-sm font-semibold hover:bg-[#5a50a8] transition-colors cursor-pointer shadow-md shadow-[#6E62C2]/25 disabled:opacity-60 disabled:cursor-wait">
                {ai.status === "loading" ? "읽고 있습니다…" : ai.status === "done" ? "다시 해설" : "✦ AI 해설 받기"}
              </button>
            </div>
            {ai.status === "error" && <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5"><p className="text-rose-700 text-xs">{ai.message}</p></div>}
            {ai.status === "done" && (
              <div className="space-y-4">
                <div className="bg-[#6E62C2] text-white rounded-2xl px-5 py-4">
                  <p className="text-[10px] font-semibold opacity-80">먼저 볼 것</p>
                  <p className="text-sm font-semibold mt-1 leading-relaxed">{ai.data.headline}</p>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {ai.data.insights.map((ins, i) => {
                    const s = SEVERITY[ins.severity];
                    return (
                      <div key={i} className={`rounded-2xl border p-4 ${s.cls}`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                          <p className="text-sm font-bold">{ins.title}</p>
                          <span className="text-[10px] ml-auto opacity-70">{s.label}</span>
                        </div>
                        <p className="text-xs leading-relaxed">{ins.detail}</p>
                        <p className="text-xs font-semibold mt-2">→ {ins.action}</p>
                      </div>
                    );
                  })}
                </div>
                {ai.data.questions_for_accountant.length > 0 && (
                  <div className="bg-[#F5F6F8] rounded-2xl px-5 py-4">
                    <p className="text-xs font-bold text-[#111111] mb-1.5">세무사·회계사에게 물어볼 것</p>
                    <ul className="space-y-1">{ai.data.questions_for_accountant.map((q, i) => <li key={i} className="text-xs text-[#444444]">{i + 1}. {q}</li>)}</ul>
                  </div>
                )}
                <p className="text-[10px] text-[#888888]">AI 해설은 참고용이며 재무·세무 자문이 아닙니다. 숫자 계산은 코드가 했고, AI는 그 숫자를 읽어 설명만 했습니다.{ai.model && <span className="font-mono"> · {ai.model}</span>}</p>
              </div>
            )}
          </div>
        </>
      )}

      {!table && !fileError && (
        <div className="bg-white border border-dashed border-[#E4E6EA] rounded-2xl p-10 text-center">
          <p className="text-[#444444] text-sm">현금흐름표를 올리거나 샘플로 먼저 보세요.</p>
          <p className="text-[#888888] text-xs mt-1">현금출납장·가계부형·월간표 어느 양식이든, 형식이 달라도 직접 열을 지정해 읽을 수 있습니다.</p>
        </div>
      )}

      <Disclaimer />
    </div>
  );
}
