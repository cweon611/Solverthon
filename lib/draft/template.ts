// lib/draft/template.ts — AI 없이 만드는 기본 신청서 양식 (결정론)
// 공고 분야별 표준 목차에 {{프로필}} · {{lib:내 사업 정보}} · {{eligibility_summary}} 토큰을 배치한다.
// 창업 분야는 창업사업화 사업계획서의 PSST(문제 인식 · 실현 가능성 · 성장 전략 · 팀 구성) 구조를 따른다.
// 공고가 자체 서식을 주면 그 서식이 우선이다 — 경고에 적는다.

import type { DraftOutput } from "@/lib/ai/geminiSchemas";
import { fmtDate, fromIso } from "@/lib/engine/format";
import type { Condition, ConditionGroup, Program, SupportField } from "@/lib/types";

type Format = "psst" | "rnd" | "employment" | "export" | "general";

const FORMAT_OF: Record<SupportField, Format> = {
  창업: "psst", "R&D": "rnd", 고용: "employment", 수출: "export", 금융: "general", 내수: "general", 경영: "general", 기타: "general",
};

const OVERVIEW_SECTION = {
  heading: "0. 기업 개요",
  purpose: "심사위원이 회사를 한눈에 파악하게 합니다.",
  template: "{{company_intro}}\n\n보유 인증: {{certifications}}.\n\n{{business_direction}}",
  tips: ["숫자(업력·인원·매출)는 증빙 서류와 일치해야 합니다."],
  criteria: [] as number[],
};

const ELIGIBILITY_SECTION = {
  heading: "신청 자격 충족 현황",
  purpose: "공고의 신청 자격을 요건별로 충족했음을 보여줍니다.",
  template: "{{eligibility_summary}}",
  tips: ["요건별로 증빙 서류(사업자등록증명·중소기업확인서 등)를 함께 준비하세요."],
  criteria: [] as number[],
};

interface Spec {
  overview: string;
  criteria: { name: string; what_to_show: string }[];
  sections: { heading: string; purpose: string; template: string; tips: string[]; criteria: number[] }[];
}

const SPECS: Record<Format, Spec> = {
  psst: {
    overview: "창업사업화 사업계획서의 표준 구조(PSST)로 만든 기본 양식입니다. 심사위원은 문제를 정확히 봤는지, 풀 수 있는지, 키울 수 있는지, 해낼 팀인지를 봅니다.",
    criteria: [
      { name: "문제 인식 (Problem)", what_to_show: "고객이 겪는 문제가 실재하고 크다는 근거" },
      { name: "실현 가능성 (Solution)", what_to_show: "제품·서비스로 문제를 푸는 방법과 현재 개발 단계, 차별성" },
      { name: "성장 전략 (Scale-up)", what_to_show: "시장 규모, 사업화 일정, 자금 사용 계획" },
      { name: "팀 구성 (Team)", what_to_show: "대표·팀의 역량과 채용 계획" },
    ],
    sections: [
      { heading: "1. 문제 인식 (Problem)", purpose: "해결할 문제와 목표 고객을 정의합니다.", criteria: [0],
        template: "{{lib:problem}}\n\n목표 고객은 {{lib:customer}}",
        tips: ["문제의 크기를 숫자로 보여주세요.", "고객 인터뷰·설문 같은 직접 검증 근거가 가점 요인입니다."] },
      { heading: "2. 실현 가능성 (Solution)", purpose: "제품·서비스와 차별성, 지금까지의 성과를 보여줍니다.", criteria: [1],
        template: "{{lib:solution}}\n\n{{lib:differentiation}}\n\n현재까지의 성과: {{lib:traction}}",
        tips: ["'무엇을 만들지'보다 '지금 어디까지 만들었는지'를 구체적으로.", "경쟁 서비스 비교표가 있으면 좋습니다."] },
      { heading: "3. 성장 전략 (Scale-up)", purpose: "시장·일정·자금 계획을 제시합니다.", criteria: [2],
        template: "{{lib:market}}\n\n추진 일정: {{lib:schedule}}\n\n자금 사용 계획: {{lib:budget}}",
        tips: ["시장 규모 숫자에는 반드시 출처를 적으세요.", "자금 계획은 공고의 비목(인건비·외주비 등) 기준에 맞춰야 합니다."] },
      { heading: "4. 팀 구성 (Team)", purpose: "이 사업을 해낼 역량을 보여줍니다.", criteria: [3],
        template: "{{lib:team}}\n\n기대효과·고용 계획: {{lib:impact}}",
        tips: ["대표자 경력과 사업 아이템의 연관성을 강조하세요."] },
    ],
  },
  rnd: {
    overview: "기술개발 과제 계획서의 일반 구조로 만든 기본 양식입니다. 심사위원은 기술의 필요성과 목표의 구체성, 사업화 가능성, 수행 역량을 봅니다.",
    criteria: [
      { name: "기술성", what_to_show: "개발 필요성과 목표의 구체성·도전성" },
      { name: "사업성", what_to_show: "개발 결과의 시장성과 사업화 계획" },
      { name: "수행 역량", what_to_show: "연구 인력·장비·실적" },
    ],
    sections: [
      { heading: "1. 기술개발 필요성", purpose: "왜 이 기술이 필요한지 보여줍니다.", criteria: [0],
        template: "{{lib:problem}}\n\n기존 기술·제품의 한계: [[현재 기술·경쟁 제품의 한계를 2~3문장으로]]", tips: ["국내외 기술 동향을 근거로 제시하세요."] },
      { heading: "2. 기술개발 목표 및 내용", purpose: "무엇을 어느 수준까지 개발할지 정합니다.", criteria: [0],
        template: "{{lib:solution}}\n\n정량 목표: [[성능 지표와 목표치 (예: 정확도 95% 이상)]]\n\n추진 일정: {{lib:schedule}}", tips: ["목표는 측정 가능한 수치로 쓰세요."] },
      { heading: "3. 사업화 계획", purpose: "개발 결과를 어떻게 팔지 보여줍니다.", criteria: [1],
        template: "목표 고객: {{lib:customer}}\n\n{{lib:market}}\n\n{{lib:differentiation}}\n\n기대효과: {{lib:impact}}", tips: ["매출 목표는 근거와 함께 제시하세요."] },
      { heading: "4. 수행 역량", purpose: "개발을 해낼 인력과 실적을 보여줍니다.", criteria: [2],
        template: "{{lib:team}}\n\n보유 실적: {{lib:traction}}\n\n연구비 사용 계획: {{lib:budget}}", tips: ["기업부설연구소·전담부서 보유 여부를 적으세요."] },
    ],
  },
  employment: {
    overview: "고용 지원 사업 신청서의 일반 구조로 만든 기본 양식입니다. 채용의 필요성과 고용 유지 가능성을 봅니다.",
    criteria: [
      { name: "채용 필요성", what_to_show: "사업 성장과 연결된 채용 사유" },
      { name: "고용 유지 가능성", what_to_show: "인건비 지급 여력과 유지 계획" },
    ],
    sections: [
      { heading: "1. 채용 계획", purpose: "누구를 왜 채용하는지 설명합니다.", criteria: [0],
        template: "{{lib:impact}}\n\n채용 직무와 담당 업무: [[직무명, 주요 업무, 근무 형태]]", tips: ["사업 계획과 채용 직무의 연결을 보여주세요."] },
      { heading: "2. 고용 유지 계획", purpose: "지원 기간 이후에도 고용을 유지할 수 있음을 보여줍니다.", criteria: [1],
        template: "현재까지의 성과: {{lib:traction}}\n\n인건비 재원: [[지원 종료 후 인건비를 감당할 매출·자금 계획]]", tips: ["고용보험 가입과 근로계약서 작성은 필수입니다."] },
    ],
  },
  export: {
    overview: "수출 지원 사업 신청서의 일반 구조로 만든 기본 양식입니다. 해외 시장 이해와 지원금 활용 계획을 봅니다.",
    criteria: [
      { name: "해외 진출 역량", what_to_show: "제품 경쟁력과 수출 실적·준비 정도" },
      { name: "활용 계획", what_to_show: "지원 서비스를 어디에 어떻게 쓸지" },
    ],
    sections: [
      { heading: "1. 제품 및 해외 경쟁력", purpose: "수출할 제품과 경쟁력을 설명합니다.", criteria: [0],
        template: "{{lib:solution}}\n\n{{lib:differentiation}}\n\n수출 실적·준비 현황: {{lib:traction}}", tips: ["인증(CE·FDA 등) 보유 여부를 적으세요."] },
      { heading: "2. 목표 시장과 진출 전략", purpose: "어느 나라에 어떻게 진출할지 설명합니다.", criteria: [0],
        template: "목표 국가·바이어: [[목표 국가와 바이어 유형]]\n\n{{lib:market}}", tips: ["목표 국가를 좁힐수록 설득력이 높습니다."] },
      { heading: "3. 지원금 활용 계획", purpose: "지원 서비스를 어디에 쓸지 밝힙니다.", criteria: [1],
        template: "{{lib:budget}}\n\n추진 일정: {{lib:schedule}}", tips: ["공고의 지원 가능 항목 안에서만 계획하세요."] },
    ],
  },
  general: {
    overview: "지원 신청서의 일반 구조로 만든 기본 양식입니다. 자금·지원이 필요한 이유와 사용 계획, 기대효과를 봅니다.",
    criteria: [
      { name: "필요성", what_to_show: "지원이 왜 지금 필요한지" },
      { name: "사용 계획", what_to_show: "지원금을 어디에 어떻게 쓸지" },
      { name: "기대효과", what_to_show: "지원 후 매출·고용 변화" },
    ],
    sections: [
      { heading: "1. 사업 현황과 지원 필요성", purpose: "지원이 필요한 이유를 설명합니다.", criteria: [0],
        template: "{{lib:solution}}\n\n현재까지의 성과: {{lib:traction}}\n\n지원이 필요한 이유: [[지금 이 지원이 필요한 구체적 사유]]", tips: ["현재 겪는 어려움을 숫자로 보여주세요."] },
      { heading: "2. 자금·지원 사용 계획", purpose: "지원금의 용도를 밝힙니다.", criteria: [1],
        template: "{{lib:budget}}\n\n추진 일정: {{lib:schedule}}", tips: ["용도별 금액을 나눠 적으세요."] },
      { heading: "3. 기대효과", purpose: "지원 후 달라질 모습을 보여줍니다.", criteria: [2],
        template: "{{lib:impact}}", tips: ["매출·고용 목표는 근거와 함께."] },
    ],
  },
};

function leaves(n: Condition | ConditionGroup): Condition[] {
  return "conditions" in n ? n.conditions.flatMap(leaves) : [n];
}

export function basicFormatOf(program: Program): Format {
  return FORMAT_OF[program.support_field] ?? "general";
}

/** 공고 하나에 대한 기본 양식. 모든 값은 토큰으로 두고, 채우기는 prefill.ts가 한다 */
export function buildBasicDraft(program: Program): DraftOutput {
  const spec = SPECS[basicFormatOf(program)];
  const end = program.apply_end ? fromIso(program.apply_end) : null;
  const warnings = [
    "이 양식은 AI 없이 만든 기본 목차입니다. 공고에 지정 서식(사업계획서 양식)이 있으면 반드시 그 목차와 분량을 따르세요.",
    end ? `접수 마감 ${fmtDate(end)} — 서류 발급 기간을 고려해 미리 준비하세요.` : "상시 접수 사업입니다. 예산 소진 시 조기 마감될 수 있습니다.",
  ];
  if (leaves(program.eligibility).some((c) => c.field === "prior_support")) {
    warnings.push("같은 계열 사업을 이미 받은 적이 있으면 신청이 제한됩니다. 수혜 이력을 확인하세요.");
  }
  return {
    title: `${program.title} 사업계획서`,
    overview: spec.overview,
    evaluation_criteria: spec.criteria.map((c) => ({ ...c, weight_text: "공고에서 배점 확인" })),
    sections: [OVERVIEW_SECTION, ...spec.sections, ELIGIBILITY_SECTION],
    documents: program.required_documents.map((d) => ({ name: d.name, is_required: d.is_required, note: "" })),
    warnings,
  };
}
