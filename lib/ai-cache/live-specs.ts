// lib/ai-cache/live-specs.ts — 실공고용 신청서 초안 양식 (AI: Claude Opus 5가 개발 중 작성)
// 실공고는 입주·전시·교육·사업화처럼 성격이 뚜렷하게 갈린다. 성격별 목차를 미리 써 두고,
// 공고 제목·요약·제출서류 같은 사실은 수집한 공고 데이터에서 채운다(지어내지 않는다).

import type { Program } from "@/lib/types";

export type LiveKind = "incubation" | "showcase" | "education" | "business";

export interface LiveSpec {
  kind: LiveKind;
  label: string;
  overview: string;
  criteria: { name: string; what_to_show: string }[];
  sections: { heading: string; purpose: string; template: string; tips: string[]; criteria: number[] }[];
  warnings: string[];
}

const INTRO = "{{company_intro}}";
const ELIGIBILITY = { heading: "신청 자격 충족 현황", purpose: "공고의 신청 자격을 요건별로 확인합니다.", template: "{{eligibility_summary}}", tips: ["요건별 증빙 서류를 함께 준비하세요."], criteria: [] };

export const LIVE_SPECS: Record<LiveKind, LiveSpec> = {
  incubation: {
    kind: "incubation",
    label: "입주·보육",
    overview: "공간 입주와 보육 프로그램에 지원하는 신청서입니다. 심사에서는 입주 기간에 무엇을 이룰지, 그리고 그 공간이 왜 필요한지를 봅니다.",
    criteria: [
      { name: "사업 아이템", what_to_show: "해결하려는 문제와 제품·서비스의 구체성" },
      { name: "입주 필요성", what_to_show: "이 공간·보육이 필요한 이유와 활용 계획" },
      { name: "성장 계획", what_to_show: "입주 기간 중 목표와 팀 운영 계획" },
    ],
    sections: [
      { heading: "1. 기업 개요", purpose: "회사와 대표자를 소개합니다.", criteria: [], template: `${INTRO}\n\n{{lib:team}}`, tips: ["사업자등록증·재직 증빙과 숫자를 맞추세요."] },
      { heading: "2. 사업 아이템", purpose: "무엇을 하는 사업인지 설명합니다.", criteria: [0], template: "{{lib:problem}}\n\n{{lib:solution}}\n\n{{lib:differentiation}}", tips: ["시제품·서비스 화면이 있으면 캡처를 붙이세요."] },
      { heading: "3. 목표 고객과 시장", purpose: "누구에게 파는지 밝힙니다.", criteria: [0], template: "{{lib:customer}}\n\n{{lib:market}}", tips: ["시장 규모에는 출처를 적으세요."] },
      { heading: "4. 입주 필요성과 활용 계획", purpose: "왜 이 공간·프로그램이 필요한지 적습니다.", criteria: [1], template: "[[현재 근무 환경과 이 공간이 필요한 이유]]\n\n[[입주 기간 중 활용하려는 보육·멘토링 프로그램]]", tips: ["단순한 임차료 절감보다 프로그램 활용 계획이 설득력 있습니다."] },
      { heading: "5. 추진 일정과 성장 계획", purpose: "입주 기간의 목표를 제시합니다.", criteria: [2], template: "{{lib:schedule}}\n\n{{lib:impact}}", tips: ["입주 기간과 같은 길이로 일정을 잡으세요."] },
      ELIGIBILITY,
    ],
    warnings: ["입주에는 보증금·관리비 등 자부담이 있을 수 있습니다. 공고에서 확인하세요.", "사업자 주소 이전 의무가 붙는 경우가 많습니다."],
  },
  showcase: {
    kind: "showcase",
    label: "전시·IR·상담회",
    overview: "전시회·투자 상담회 참가 신청서입니다. 심사에서는 현장에서 보여 줄 것이 준비되어 있는지와 참가 목적의 구체성을 봅니다.",
    criteria: [
      { name: "제품 완성도", what_to_show: "현장에서 보여 줄 제품·서비스의 상태" },
      { name: "참가 목적", what_to_show: "만나고 싶은 상대와 기대하는 결과" },
      { name: "후속 계획", what_to_show: "행사 이후 이어갈 계획" },
    ],
    sections: [
      { heading: "1. 기업 개요", purpose: "회사를 간단히 소개합니다.", criteria: [], template: `${INTRO}\n\n{{business_direction}}`, tips: ["한 문장 소개를 미리 다듬어 두세요."] },
      { heading: "2. 제품·서비스 소개", purpose: "현장에서 보여 줄 것을 설명합니다.", criteria: [0], template: "{{lib:problem}}\n\n{{lib:solution}}\n\n{{lib:differentiation}}", tips: ["시연 가능한 형태인지 밝히세요."] },
      { heading: "3. 성과와 시장", purpose: "지금까지의 실적을 보여줍니다.", criteria: [0], template: "{{lib:traction}}\n\n{{lib:market}}", tips: ["투자 상담회라면 매출·사용자 지표를 앞세우세요."] },
      { heading: "4. 참가 목적", purpose: "무엇을 얻으러 가는지 적습니다.", criteria: [1], template: "[[이 행사에서 만나고 싶은 상대 (바이어·투자자·협력사)와 이유]]\n\n[[행사에서 달성할 목표 (상담 건수·계약·투자 유치 등)]]", tips: ["목표를 숫자로 적으면 구체해집니다."] },
      { heading: "5. 기대효과와 후속 계획", purpose: "행사 이후를 계획합니다.", criteria: [2], template: "{{lib:impact}}\n\n[[행사 이후 후속 조치 계획]]", tips: ["사후 보고 의무가 있는지 확인하세요."] },
      ELIGIBILITY,
    ],
    warnings: ["참가비·부스비 자부담과 취소 규정을 확인하세요.", "전시 부스 준비물(배너·샘플·영문 자료)은 별도 비용이 듭니다."],
  },
  education: {
    kind: "education",
    label: "교육·네트워킹",
    overview: "교육 과정·캠프·네트워킹 프로그램 참가 신청서입니다. 참가 동기와 과정 이후 계획이 핵심입니다.",
    criteria: [
      { name: "참가 동기", what_to_show: "지금 이 과정이 필요한 이유" },
      { name: "적용 계획", what_to_show: "배운 것을 사업에 어떻게 적용할지" },
    ],
    sections: [
      { heading: "1. 기업·참가자 개요", purpose: "회사와 참가자를 소개합니다.", criteria: [], template: `${INTRO}\n\n{{lib:team}}`, tips: ["참가자 본인의 역할을 적으세요."] },
      { heading: "2. 현재 사업과 어려움", purpose: "지금 상황을 설명합니다.", criteria: [0], template: "{{lib:solution}}\n\n{{lib:problem}}", tips: ["구체적인 어려움일수록 선발에 유리합니다."] },
      { heading: "3. 참가 동기와 적용 계획", purpose: "과정을 어떻게 쓸지 적습니다.", criteria: [1], template: "[[이 과정에서 배우고 싶은 것]]\n\n[[과정 종료 후 사업에 적용할 계획]]", tips: ["커리큘럼을 보고 구체적으로 연결하세요."] },
      { heading: "4. 기대효과", purpose: "과정 이후 목표를 제시합니다.", criteria: [1], template: "{{lib:impact}}", tips: [] },
      ELIGIBILITY,
    ],
    warnings: ["출석률·수료 기준이 있는 경우가 많습니다. 일정 참여가 가능한지 확인하세요."],
  },
  business: {
    kind: "business",
    label: "사업화·자금",
    overview: "사업화 자금·지원 프로그램 신청서입니다. 문제와 해결책, 시장, 자금 사용 계획, 팀을 차례로 보여 줍니다.",
    criteria: [
      { name: "문제 인식", what_to_show: "고객 문제의 실재와 크기" },
      { name: "실현 가능성", what_to_show: "제품 상태와 차별성, 지금까지의 성과" },
      { name: "성장 전략", what_to_show: "시장·일정·자금 계획" },
      { name: "팀 구성", what_to_show: "수행 역량과 고용 계획" },
    ],
    sections: [
      { heading: "1. 기업 개요", purpose: "회사를 소개합니다.", criteria: [], template: `${INTRO}\n\n{{business_direction}}`, tips: [] },
      { heading: "2. 문제 인식", purpose: "해결할 문제와 고객을 정의합니다.", criteria: [0], template: "{{lib:problem}}\n\n{{lib:customer}}", tips: ["문제 크기를 숫자로 보여주세요."] },
      { heading: "3. 실현 가능성", purpose: "제품과 차별성, 성과를 보여줍니다.", criteria: [1], template: "{{lib:solution}}\n\n{{lib:differentiation}}\n\n{{lib:traction}}", tips: ["'무엇을 만들지'보다 '어디까지 만들었는지'."] },
      { heading: "4. 성장 전략과 자금 계획", purpose: "시장·일정·자금을 제시합니다.", criteria: [2], template: "{{lib:market}}\n\n{{lib:schedule}}\n\n{{lib:budget}}", tips: ["비목은 공고 기준에 맞추세요."] },
      { heading: "5. 팀 구성과 기대효과", purpose: "실행 역량과 목표를 보여줍니다.", criteria: [3], template: "{{lib:team}}\n\n{{lib:impact}}", tips: [] },
      ELIGIBILITY,
    ],
    warnings: ["지원금 집행 기준(비목·자부담)을 공고에서 확인하세요."],
  },
};

/** 공고 제목·분야로 성격을 고른다 */
export function pickLiveKind(program: Program): LiveKind {
  const t = program.title;
  if (/입주|보육실|센터 입주|오피스|공간/.test(t)) return "incubation";
  if (/전시|박람회|엑스포|EXPO|팝업|IR|투자상담|상담회|데모데이|공모전|경진대회|어워즈|Awards/i.test(t)) return "showcase";
  if (/교육|캠프|아카데미|특강|밋업|세미나|워크숍|양성|멘토링|과정/.test(t)) return "education";
  return "business";
}
