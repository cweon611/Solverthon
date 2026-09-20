// lib/draft/tables.ts — 신청서에 들어가는 표 뼈대 (결정론, LLM 없음)
// 사업계획서 심사에서 거의 항상 요구되는 세 가지 표를 미리 만들어 둔다: 추진 일정 · 자금 소요 · 정량 목표.
// 숫자는 지어내지 않는다. 회사 프로필에서 아는 값만 채우고 나머지는 [[빈칸]]으로 둔다.
// 표는 Markdown 형식이다 — 편집기에서 그대로 보이고, 복사하면 한글·워드 표로 붙일 수 있다.

import { fmtDate, fromIso } from "@/lib/engine/format";
import type { CompanyProfile, Program } from "@/lib/types";

/** 협약 기간을 모를 때 쓰는 기본 구간 — 공고에서 확인하라고 표 아래에 적는다 */
const DEFAULT_PHASES = ["1~3개월", "4~6개월", "7~9개월", "10~12개월"];

function table(headers: string[], rows: string[][]): string {
  const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
  return [line(headers), line(headers.map(() => "---")), ...rows.map(line)].join("\n");
}

/** 추진 일정표. 접수 마감일이 있으면 협약 시작 시점을 가늠해 적어 준다 */
export function scheduleTable(program: Program): string {
  const end = program.apply_end ? fromIso(program.apply_end) : null;
  const note = end
    ? `※ 접수 마감 ${fmtDate(end)} 기준으로 작성했습니다. 실제 협약 기간은 공고문에서 확인해 고치세요.`
    : "※ 상시 접수 사업입니다. 협약 기간은 공고문에서 확인해 고치세요.";
  return [
    table(
      ["구분", "추진 내용", "산출물", "담당"],
      DEFAULT_PHASES.map((p) => [p, `[[${p}에 할 일]]`, "[[산출물]]", "[[담당자]]"]),
    ),
    note,
  ].join("\n\n");
}

/** 자금 소요표. 비목은 정부지원사업에서 통용되는 구분을 쓰되, 공고 기준이 우선이라고 적는다 */
export function budgetTable(): string {
  const items = ["인건비", "외주용역비", "재료비·시제품 제작비", "장비·시설비", "마케팅·홍보비", "기타"];
  return [
    table(
      ["비목", "산출 근거", "정부지원금", "자부담", "합계"],
      items.map((i) => [i, "[[산출 근거]]", "[[금액]]", "[[금액]]", "[[금액]]"]),
    ),
    "※ 비목 구분과 자부담 비율은 공고의 비목 기준을 따르세요. 합계는 신청 금액과 일치해야 합니다.",
  ].join("\n\n");
}

/** 정량 목표표. 현재 값 중 회사 프로필로 아는 것(고용·매출)은 채워 둔다 */
export function targetTable(profile: CompanyProfile | null): string {
  const employees = profile ? `${profile.employee_count}명` : "[[현재]]";
  const revenue =
    profile && profile.annual_revenue_krw !== null
      ? `${(profile.annual_revenue_krw / 100_000_000).toLocaleString("ko-KR")}억원`
      : "[[현재]]";
  return [
    table(
      ["지표", "현재", "1년 후 목표", "산출 근거"],
      [
        ["매출액", revenue, "[[목표]]", "[[근거]]"],
        ["고용 인원", employees, "[[목표]]", "[[근거]]"],
        ["고객 수", "[[현재]]", "[[목표]]", "[[근거]]"],
        ["[[핵심 지표]]", "[[현재]]", "[[목표]]", "[[근거]]"],
      ],
    ),
    "※ 현재 값은 프로필에서 가져왔습니다. 증빙 서류의 수치와 같은지 확인하세요.",
  ].join("\n\n");
}
