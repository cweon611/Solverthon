// lib/draft/enrich.ts — 목차 뼈대를 "읽히는 신청서 문단"으로 만든다 (결정론, LLM 없음)
//
// 문제: 뼈대는 {{lib:problem}} 같은 토큰만 줄줄이 있어, 값을 채워도 문장이 이어지지 않고 덩어리로 붙는다.
// 그래서 (1) 각 토큰 앞에 도입 문장을 넣고, (2) 문단 성격에 맞는 표(일정·자금·목표)를 끼운다.
// 이미 저장된 초안(AI가 만든 것 포함)에도 화면에 그릴 때 적용되므로 다시 생성할 필요가 없다.
// 사실을 지어내지 않는다 — 도입 문장은 연결어일 뿐이고, 숫자가 들어갈 칸은 빈칸으로 남는다.

import type { LibKey } from "@/lib/draft/library";
import { budgetTable, scheduleTable, targetTable } from "@/lib/draft/tables";
import type { CompanyProfile, Program } from "@/lib/types";

/** {{lib:키}} 앞에 붙는 도입 문장 */
const LEAD_IN: Record<LibKey, string> = {
  problem: "당사가 해결하려는 문제는 다음과 같습니다.",
  customer: "본 사업의 목표 고객은 다음과 같습니다.",
  solution: "이 문제를 해결하기 위해 당사가 개발·제공하는 제품과 서비스는 다음과 같습니다.",
  differentiation: "기존 제품·대체 수단과 비교한 당사의 차별점은 다음과 같습니다.",
  market: "목표 시장의 규모와 근거는 다음과 같습니다.",
  traction: "현재까지 확인한 성과는 다음과 같습니다.",
  team: "이 사업을 수행할 팀 구성과 역량은 다음과 같습니다.",
  schedule: "협약 기간 중 추진 일정은 다음과 같습니다.",
  budget: "지원금과 자부담의 사용 계획은 다음과 같습니다.",
  impact: "지원 이후 기대하는 성과와 고용 계획은 다음과 같습니다.",
};

const LIB_LINE_RE = /^\s*\{\{\s*lib:([a-z_]+)\s*\}\}\s*$/;
/** "목표 고객", "현재까지의 성과:" 같은 짧은 꼬리표 줄 — 도입 문장으로 바꾼다 */
const MINI_HEADING_RE = /^\s*[^.!?\n]{1,18}[:：]?\s*$/;

export type TableKind = "schedule" | "budget" | "targets";

/** 문단 제목으로 어떤 표가 어울리는지 정한다 */
export function tableFor(heading: string): TableKind | null {
  if (/일정|추진 계획|로드맵/.test(heading)) return "schedule";
  if (/자금|예산|비용|사용 계획/.test(heading)) return "budget";
  if (/기대효과|성과 목표|정량|목표와/.test(heading)) return "targets";
  return null;
}

function renderTable(kind: TableKind, program: Program, profile: CompanyProfile | null): string {
  if (kind === "schedule") return `[추진 일정표]\n${scheduleTable(program)}`;
  if (kind === "budget") return `[자금 소요표]\n${budgetTable()}`;
  return `[정량 목표표]\n${targetTable(profile)}`;
}

export interface EnrichOptions {
  heading: string;
  program: Program;
  profile: CompanyProfile | null;
  /** 한 초안에서 같은 표가 두 번 들어가지 않게 호출부가 넘긴다 */
  usedTables: Set<TableKind>;
}

/**
 * 템플릿 한 문단을 다듬는다.
 * - {{lib:키}}만 있는 줄 앞에 도입 문장을 넣는다 (바로 앞 줄이 이미 문장이면 그대로 둔다)
 * - 짧은 꼬리표 줄("목표 고객")이 토큰 바로 앞에 있으면 도입 문장으로 바꾼다
 * - 문단 성격에 맞는 표를 한 번만 덧붙인다
 */
export function enrichTemplate(template: string, opts: EnrichOptions): string {
  const lines = template.split("\n");
  const out: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(LIB_LINE_RE);
    if (!m) {
      out.push(lines[i]);
      continue;
    }
    const key = m[1] as LibKey;
    const lead = LEAD_IN[key];
    if (lead) {
      const prev = out.length > 0 ? out[out.length - 1] : "";
      const prevIsMiniHeading = prev.trim() !== "" && MINI_HEADING_RE.test(prev) && !prev.includes("{{");
      if (prevIsMiniHeading) out[out.length - 1] = lead; // 꼬리표를 문장으로 교체
      else if (!prev.trim().endsWith("다.") && !prev.includes(lead)) out.push(lead);
    }
    out.push(lines[i]);
  }

  const kind = tableFor(opts.heading);
  if (kind && !opts.usedTables.has(kind)) {
    opts.usedTables.add(kind);
    out.push("", renderTable(kind, opts.program, opts.profile));
  }
  return out.join("\n");
}

/** 첫 문단에 넣는 회사 소개 문장 ({{company_intro}}) — 프로필과 판정 결과에서 만든다 */
export function companyIntro(program: Program, profile: CompanyProfile, ageText: string, passedLabels: string[]): string {
  const base = `${profile.name}은(는) ${profile.region_label}에 소재한 ${profile.industry_label} ${
    profile.business_type === "corporation" ? "법인" : "개인사업자"
  }로, ${profile.founded_at.replace(/-/g, ".")}에 사업을 시작해 업력 ${ageText}, 상시근로자 ${profile.employee_count}명입니다.`;
  const fit =
    passedLabels.length > 0
      ? ` 당사는 본 공고(${program.title})가 요구하는 ${passedLabels.slice(0, 3).join(" · ")} 요건을 충족합니다.`
      : ` 본 공고(${program.title})의 신청 자격은 아래 '신청 자격 충족 현황'에 정리했습니다.`;
  return base + fit;
}
