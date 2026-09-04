"use client";

// lib/cashflow/readExcel.ts — 엑셀·CSV 파일을 브라우저에서 2차원 배열로 읽는다. 파일은 서버로 가지 않는다.

import * as XLSX from "xlsx";

export interface SheetData {
  name: string;
  rows: unknown[][];
}

/** 워크북의 모든 시트를 2차원 배열로 읽는다. 기업마다 시트를 나누는 방식이 달라 첫 시트만 보지 않는다 */
export async function readWorkbookAllSheets(file: File): Promise<SheetData[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: false });
  return wb.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: true, defval: null }),
  }));
}

export async function readWorkbook(file: File): Promise<{ rows: unknown[][]; sheetName: string }> {
  const sheets = await readWorkbookAllSheets(file);
  return { rows: sheets[0]?.rows ?? [], sheetName: sheets[0]?.name ?? "" };
}

/** 사용자가 채워 넣을 수 있는 템플릿을 내려준다 */
export function downloadTemplate(rows: (string | number)[][]): void {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 12 }, { wch: 8 }, { wch: 18 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "현금흐름");
  XLSX.writeFile(wb, "비즈버디_현금흐름표_템플릿.xlsx");
}
