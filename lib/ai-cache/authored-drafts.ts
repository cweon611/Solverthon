// lib/ai-cache/authored-drafts.ts — 시연용 신청서 초안 목차 (AI: Claude Opus 5가 개발 중 작성)
// scripts/build-authored.ts가 공고의 제출서류·마감일을 붙여 DraftOutput으로 완성한다.
// 토큰 규칙은 프롬프트와 같다: {{프로필키}} · {{lib:내 사업 정보}} · {{eligibility_summary}} · [[이 공고에만 쓸 빈칸]].
// {{lib:키}}는 문장 중간에 넣지 않고 줄을 바꿔 단독으로 둔다.

export interface AuthoredSection {
  heading: string;
  purpose: string;
  template: string;
  tips: string[];
  criteria: number[];
}

export interface AuthoredDraft {
  title: string;
  overview: string;
  evaluation_criteria: { name: string; weight_text: string; what_to_show: string }[];
  sections: AuthoredSection[];
  warnings: string[];
}

const COMPANY = "{{company_name}}은(는) {{region}}에 소재한 {{industry}} {{business_type}}로, {{founded_at}}에 개업하여 업력 {{business_age}}, 상시근로자 {{employee_count}}입니다.";

export const AUTHORED_DRAFTS: Record<string, AuthoredDraft> = {
  "seed-05": {
    title: "TIPS 프로그램 4분기 사업계획서",
    overview: "TIPS는 운영사의 선투자와 추천을 전제로 하는 사업입니다. 심사에서는 기술의 독창성, 운영사 투자와 연계된 사업화 계획, 창업팀의 실행력을 봅니다.",
    evaluation_criteria: [
      { name: "기술 독창성", weight_text: "공고에서 배점 확인", what_to_show: "핵심 기술의 차별성과 권리 확보 계획" },
      { name: "사업화 가능성", weight_text: "공고에서 배점 확인", what_to_show: "목표 시장과 수익 모델, 투자 연계 계획" },
      { name: "창업팀 역량", weight_text: "공고에서 배점 확인", what_to_show: "기술·사업 인력의 경력과 전담 여부" },
    ],
    sections: [
      { heading: "1. 기업 및 팀 개요", purpose: "회사와 창업팀을 한눈에 보여줍니다.", criteria: [2],
        template: `${COMPANY}\n\n{{lib:team}}`, tips: ["대표자·핵심 인력의 기술 경력을 앞세우세요."] },
      { heading: "2. 해결하려는 문제와 기술", purpose: "왜 이 기술이 필요한지 설명합니다.", criteria: [0],
        template: "{{lib:problem}}\n\n{{lib:solution}}\n\n{{lib:differentiation}}", tips: ["기존 기술과의 비교를 표로 정리하면 좋습니다.", "특허·논문 등 권리 확보 현황을 적으세요."] },
      { heading: "3. 운영사 연계 및 투자 계획", purpose: "TIPS의 전제인 운영사 추천·선투자 상황을 밝힙니다.", criteria: [1],
        template: "[[추천 운영사명과 선투자 금액·시점 (협의 중이면 진행 상황)]]\n\n[[운영사와 함께 진행할 보육·멘토링 계획]]", tips: ["운영사 추천이 없으면 신청 자체가 어렵습니다. 진행 상황을 솔직히 적으세요."] },
      { heading: "4. 사업화 전략", purpose: "기술을 어떻게 매출로 연결할지 보여줍니다.", criteria: [1],
        template: "목표 고객\n{{lib:customer}}\n\n{{lib:market}}\n\n{{lib:schedule}}", tips: ["시장 규모에는 출처를 반드시 적으세요."] },
      { heading: "5. 자금 계획과 기대효과", purpose: "지원금 사용처와 성과 목표를 제시합니다.", criteria: [1],
        template: "{{lib:budget}}\n\n{{lib:impact}}", tips: ["연구개발비 비목은 공고 기준에 맞춰 나누세요."] },
      { heading: "6. 신청 자격 충족 현황", purpose: "공고의 신청 자격을 요건별로 확인합니다.", criteria: [],
        template: "{{eligibility_summary}}", tips: ["운영사 추천 서류는 별도 증빙이 필요합니다."] },
    ],
    warnings: ["운영사 추천·선투자 증빙이 없으면 접수되지 않을 수 있습니다.", "운영사 선정과 투자 협의에 수개월이 걸립니다. 일정 확인이 필요합니다."],
  },
  "seed-07": {
    title: "수출바우처 4분기 사업계획서",
    overview: "수출 실적이 있는 기업이 해외 마케팅 서비스를 바우처로 이용하는 사업입니다. 심사에서는 수출 역량과 바우처 사용 계획의 구체성을 봅니다.",
    evaluation_criteria: [
      { name: "수출 역량", weight_text: "공고에서 배점 확인", what_to_show: "제품 경쟁력과 기존 수출 실적" },
      { name: "목표 시장 적합성", weight_text: "공고에서 배점 확인", what_to_show: "목표 국가 선정 근거와 바이어 발굴 계획" },
      { name: "바우처 활용 계획", weight_text: "공고에서 배점 확인", what_to_show: "서비스 메뉴별 사용 계획과 기대 성과" },
    ],
    sections: [
      { heading: "1. 기업 개요와 수출 현황", purpose: "회사와 수출 실적을 정리합니다.", criteria: [0],
        template: `${COMPANY}\n\n수출 실적 및 준비 현황\n{{lib:traction}}`, tips: ["수출 실적은 증명서 기준 금액으로 적으세요."] },
      { heading: "2. 수출 제품과 경쟁력", purpose: "무엇을 파는지와 왜 팔리는지 보여줍니다.", criteria: [0],
        template: "{{lib:solution}}\n\n{{lib:differentiation}}\n\n[[해외 인증 보유 현황 (CE·FDA 등) 또는 취득 계획]]", tips: ["목표 국가의 필수 인증을 미리 확인하세요."] },
      { heading: "3. 목표 시장과 진출 전략", purpose: "어느 나라에 어떻게 진출할지 밝힙니다.", criteria: [1],
        template: "[[목표 국가와 선정 이유]]\n\n{{lib:market}}\n\n목표 고객\n{{lib:customer}}", tips: ["국가를 좁힐수록 계획이 구체해집니다."] },
      { heading: "4. 바우처 사용 계획", purpose: "어떤 서비스에 얼마를 쓸지 적습니다.", criteria: [2],
        template: "{{lib:budget}}\n\n{{lib:schedule}}", tips: ["공고의 지원 가능 메뉴(통번역·전시회·인증 등) 안에서 계획하세요."] },
      { heading: "5. 기대 성과", purpose: "지원 후 수출 목표를 제시합니다.", criteria: [2],
        template: "{{lib:impact}}", tips: ["수출액 목표는 근거와 함께 제시하세요."] },
      { heading: "6. 신청 자격 충족 현황", purpose: "공고의 신청 자격을 요건별로 확인합니다.", criteria: [],
        template: "{{eligibility_summary}}", tips: ["수출 실적 증명서 발급에 시간이 걸립니다."] },
    ],
    warnings: ["수출 실적 증빙 기준(직접수출·간접수출)을 공고에서 확인하세요.", "바우처는 자부담 비율이 있습니다."],
  },
  "seed-08": {
    title: "청년일자리도약장려금 참여 신청서",
    overview: "청년을 새로 채용하는 기업에 인건비를 지원합니다. 심사보다 요건 충족과 채용 절차가 중요하며, 채용 전 참여 신청이 필요한지 확인해야 합니다.",
    evaluation_criteria: [
      { name: "채용 계획의 구체성", weight_text: "공고에서 배점 확인", what_to_show: "직무·인원·시점이 정해진 채용 계획" },
      { name: "고용 유지 가능성", weight_text: "공고에서 배점 확인", what_to_show: "인건비 지급 여력과 유지 계획" },
    ],
    sections: [
      { heading: "1. 기업 개요", purpose: "사업장 현황을 정리합니다.", criteria: [],
        template: `${COMPANY}\n\n{{business_direction}}`, tips: ["4대보험 가입자 수와 프로필의 직원 수가 같아야 합니다."] },
      { heading: "2. 채용 계획", purpose: "누구를 왜 채용하는지 밝힙니다.", criteria: [0],
        template: "[[채용 직무명과 주요 업무]]\n\n[[채용 인원, 채용 예정 시기, 근로 형태(정규직 여부)]]\n\n{{lib:impact}}", tips: ["사업 성장과 채용의 연결을 보여주세요.", "청년 연령 기준은 공고에서 확인하세요."] },
      { heading: "3. 고용 유지 계획", purpose: "지원 종료 후에도 유지할 수 있음을 보여줍니다.", criteria: [1],
        template: "현재까지의 성과\n{{lib:traction}}\n\n[[지원 종료 후 인건비를 감당할 매출·자금 계획]]", tips: ["지원금 종료 시점의 재무 계획을 적으세요."] },
      { heading: "4. 신청 자격 충족 현황", purpose: "공고의 신청 자격을 요건별로 확인합니다.", criteria: [],
        template: "{{eligibility_summary}}", tips: ["고용보험 가입과 근로계약서 작성은 필수입니다."] },
    ],
    warnings: ["채용 전에 참여 신청이 필요한지 공고에서 반드시 확인하세요. 먼저 채용하면 지원받지 못할 수 있습니다.", "채용 후 근로계약서 작성과 4대보험 취득신고(채용일부터 14일 이내)를 놓치지 마세요."],
  },
  "seed-09": {
    title: "소상공인 경영개선자금 신청서",
    overview: "소상공인의 경영 안정을 위한 융자입니다. 자금이 필요한 이유와 상환 계획이 핵심이며, 지원이 아니라 갚아야 하는 대출이라는 점을 전제로 씁니다.",
    evaluation_criteria: [
      { name: "자금 필요성", weight_text: "공고에서 배점 확인", what_to_show: "자금이 필요한 구체적 사유와 금액 산정 근거" },
      { name: "상환 능력", weight_text: "공고에서 배점 확인", what_to_show: "매출 추이와 상환 계획" },
    ],
    sections: [
      { heading: "1. 사업장 개요", purpose: "사업장 현황을 정리합니다.", criteria: [],
        template: `${COMPANY}\n\n{{lib:solution}}`, tips: ["소상공인 기준(업종별 상시근로자 수)을 함께 확인하세요."] },
      { heading: "2. 자금 필요성", purpose: "왜 지금 자금이 필요한지 설명합니다.", criteria: [0],
        template: "현재 상황\n{{lib:traction}}\n\n[[자금이 필요한 구체적 사유 (원재료 구매·설비·임차료 등)와 금액]]", tips: ["필요 금액은 견적서·계약서로 뒷받침하세요."] },
      { heading: "3. 자금 사용 계획", purpose: "받은 자금을 어디에 쓸지 적습니다.", criteria: [0],
        template: "{{lib:budget}}\n\n{{lib:schedule}}", tips: ["용도별 금액 합계가 신청 금액과 맞아야 합니다."] },
      { heading: "4. 상환 계획과 기대효과", purpose: "갚을 수 있음을 보여줍니다.", criteria: [1],
        template: "{{lib:impact}}\n\n[[월 예상 매출과 상환 재원 (비즈버디 현금흐름 분석 결과 활용)]]", tips: ["매출 추정은 과거 실적에 근거해 보수적으로 잡으세요."] },
      { heading: "5. 신청 자격 충족 현황", purpose: "공고의 신청 자격을 요건별로 확인합니다.", criteria: [],
        template: "{{eligibility_summary}}", tips: ["국세·지방세 완납 증명이 필요합니다."] },
    ],
    warnings: ["융자는 갚아야 하는 자금입니다. 상환 계획을 먼저 점검하세요.", "신용도·체납 여부에 따라 한도와 금리가 달라집니다."],
  },
  "seed-11": {
    title: "글로벌 액셀러레이팅 프로그램 신청서",
    overview: "해외 진출을 준비하는 창업기업의 보육·네트워킹을 지원합니다. 해외에서 통할 제품인지와 프로그램을 활용할 준비가 되어 있는지를 봅니다.",
    evaluation_criteria: [
      { name: "글로벌 확장성", weight_text: "공고에서 배점 확인", what_to_show: "해외 시장에서의 문제 해결력과 확장 가능성" },
      { name: "준비도", weight_text: "공고에서 배점 확인", what_to_show: "제품 완성도, 영어 대응 역량, 현지화 계획" },
      { name: "팀 역량", weight_text: "공고에서 배점 확인", what_to_show: "해외 사업을 끌고 갈 인력" },
    ],
    sections: [
      { heading: "1. 기업 개요", purpose: "회사를 간단히 소개합니다.", criteria: [],
        template: `${COMPANY}\n\n{{business_direction}}`, tips: [] },
      { heading: "2. 해결하는 문제와 제품", purpose: "무엇을 만드는지 보여줍니다.", criteria: [0],
        template: "{{lib:problem}}\n\n{{lib:solution}}\n\n{{lib:differentiation}}", tips: ["해외 고객에게도 같은 문제가 있는지 근거를 드세요."] },
      { heading: "3. 목표 해외 시장", purpose: "어느 시장을 노리는지 밝힙니다.", criteria: [0],
        template: "{{lib:market}}\n\n목표 고객\n{{lib:customer}}\n\n[[목표 국가와 진입 방식 (직접 판매·파트너·플랫폼 등)]]", tips: ["국가별 규제·인증 요건을 미리 확인하세요."] },
      { heading: "4. 프로그램 활용 계획", purpose: "보육 프로그램을 어떻게 쓸지 적습니다.", criteria: [1],
        template: "{{lib:schedule}}\n\n[[프로그램에서 얻고 싶은 것 (현지 바이어 미팅·법인 설립 자문 등)]]", tips: ["프로그램 일정에 참여할 수 있는 인력을 명시하세요."] },
      { heading: "5. 팀과 기대효과", purpose: "실행 역량과 목표를 제시합니다.", criteria: [2],
        template: "{{lib:team}}\n\n{{lib:impact}}", tips: ["해외 경험·어학 역량이 있으면 적으세요."] },
      { heading: "6. 신청 자격 충족 현황", purpose: "공고의 신청 자격을 요건별로 확인합니다.", criteria: [],
        template: "{{eligibility_summary}}", tips: [] },
    ],
    warnings: ["프로그램 참여에는 일정 부담이 큽니다. 참여 가능한 인력을 미리 정하세요."],
  },
  "seed-12": {
    title: "중소기업 고용창출장려금 신청서",
    overview: "근로자를 고용한 중소기업의 인건비 부담을 덜어 주는 지원입니다. 고용 규모 변화와 유지 계획이 핵심입니다.",
    evaluation_criteria: [
      { name: "고용 증가", weight_text: "공고에서 배점 확인", what_to_show: "지원 전후 고용 인원 변화" },
      { name: "고용 유지 가능성", weight_text: "공고에서 배점 확인", what_to_show: "인건비 지급 여력" },
    ],
    sections: [
      { heading: "1. 기업 개요와 고용 현황", purpose: "현재 고용 상태를 정리합니다.", criteria: [0],
        template: `${COMPANY}\n\n[[현재 근로자 수와 직무 구성, 최근 1년 입·퇴사 현황]]`, tips: ["4대보험 가입자 명부와 숫자를 맞추세요."] },
      { heading: "2. 고용 계획", purpose: "앞으로의 채용 계획을 밝힙니다.", criteria: [0],
        template: "{{lib:impact}}\n\n[[채용 예정 직무와 시기]]", tips: ["사업 계획과 채용 규모의 연결을 보여주세요."] },
      { heading: "3. 고용 유지 계획", purpose: "유지 가능함을 보여줍니다.", criteria: [1],
        template: "현재까지의 성과\n{{lib:traction}}\n\n{{lib:budget}}", tips: ["지원 종료 후의 인건비 재원을 적으세요."] },
      { heading: "4. 신청 자격 충족 현황", purpose: "공고의 신청 자격을 요건별로 확인합니다.", criteria: [],
        template: "{{eligibility_summary}}", tips: ["고용보험 성립신고가 되어 있어야 합니다."] },
    ],
    warnings: ["지원금 신청 전 고용보험 가입 여부와 체불 이력 유무를 확인하세요."],
  },
  "seed-14": {
    title: "광주 청년 일자리 도약 장려금 신청서",
    overview: "광주 지역 기업이 청년을 채용할 때 인건비를 지원합니다. 지역 요건과 청년 채용 계획이 핵심입니다.",
    evaluation_criteria: [
      { name: "지역 기여", weight_text: "공고에서 배점 확인", what_to_show: "광주 사업장 유지와 지역 인재 채용 계획" },
      { name: "채용·유지 계획", weight_text: "공고에서 배점 확인", what_to_show: "직무·인원·유지 방안" },
    ],
    sections: [
      { heading: "1. 기업 개요", purpose: "광주 사업장 현황을 정리합니다.", criteria: [0],
        template: `${COMPANY}\n\n{{business_direction}}`, tips: ["사업자등록증의 소재지가 광주인지 확인하세요."] },
      { heading: "2. 청년 채용 계획", purpose: "채용 직무와 시기를 밝힙니다.", criteria: [1],
        template: "[[채용 직무·인원·시기, 청년 연령 요건 충족 여부]]\n\n{{lib:impact}}", tips: ["지역 대학·고교 연계 채용 계획이 있으면 적으세요."] },
      { heading: "3. 고용 유지와 지역 정착", purpose: "지원 이후 계획을 보여줍니다.", criteria: [0],
        template: "현재까지의 성과\n{{lib:traction}}\n\n[[지원 종료 후 고용 유지 방안과 광주 사업장 운영 계획]]", tips: ["사업장 이전 계획이 있으면 지원이 중단될 수 있습니다."] },
      { heading: "4. 신청 자격 충족 현황", purpose: "공고의 신청 자격을 요건별로 확인합니다.", criteria: [],
        template: "{{eligibility_summary}}", tips: ["중소기업확인서 발급에 시간이 걸립니다. 미리 준비하세요."] },
    ],
    warnings: ["지원금은 채용 후 분기별로 신청해 지급받습니다. 신청 주기를 놓치지 마세요.", "사업장 이전·폐업 시 남은 지원이 중단됩니다."],
  },
  "seed-15": {
    title: "광주 청년 창업 지원금 사업계획서",
    overview: "광주 지역 청년 창업자의 초기 사업비를 지원합니다. 지역에서 사업을 이어갈 계획과 아이템의 실현 가능성을 봅니다.",
    evaluation_criteria: [
      { name: "사업 아이템", weight_text: "공고에서 배점 확인", what_to_show: "문제 정의와 해결 방법의 구체성" },
      { name: "실현 가능성", weight_text: "공고에서 배점 확인", what_to_show: "추진 일정과 자금 계획" },
      { name: "지역 연계", weight_text: "공고에서 배점 확인", what_to_show: "광주에서의 사업 운영·고용 계획" },
    ],
    sections: [
      { heading: "1. 창업자와 기업 개요", purpose: "대표자와 회사를 소개합니다.", criteria: [],
        template: `${COMPANY}\n\n{{lib:team}}`, tips: ["대표자 연령 요건(만 39세 이하) 증빙이 필요합니다."] },
      { heading: "2. 문제와 해결 방법", purpose: "사업 아이템을 설명합니다.", criteria: [0],
        template: "{{lib:problem}}\n\n{{lib:solution}}\n\n{{lib:differentiation}}", tips: ["지역에서 직접 확인한 고객 사례가 있으면 강점입니다."] },
      { heading: "3. 목표 고객과 시장", purpose: "누구에게 파는지 밝힙니다.", criteria: [0],
        template: "목표 고객\n{{lib:customer}}\n\n{{lib:market}}", tips: ["광주·전남 시장 규모를 함께 제시하면 좋습니다."] },
      { heading: "4. 추진 일정과 자금 계획", purpose: "지원금 사용 계획을 적습니다.", criteria: [1],
        template: "{{lib:schedule}}\n\n{{lib:budget}}", tips: ["지원금 사용 가능 비목을 공고에서 확인하세요."] },
      { heading: "5. 지역 기여와 기대효과", purpose: "지역 연계 계획을 보여줍니다.", criteria: [2],
        template: "{{lib:impact}}\n\n[[광주 지역에서의 사업장 운영·고용·협력 계획]]", tips: ["지역 기관·대학과의 협력 계획이 있으면 적으세요."] },
      { heading: "6. 신청 자격 충족 현황", purpose: "공고의 신청 자격을 요건별로 확인합니다.", criteria: [],
        template: "{{eligibility_summary}}", tips: [] },
    ],
    warnings: ["지원 기간 중 사업장을 광주 밖으로 옮기면 지원이 중단될 수 있습니다."],
  },
  "seed-16": {
    title: "광주테크노파크 지역특화 R&D 사업계획서",
    overview: "광주 지역 특화 산업과 연계된 기술개발을 지원합니다. 기술의 필요성과 지역 산업과의 연결, 수행 역량을 봅니다.",
    evaluation_criteria: [
      { name: "기술성", weight_text: "공고에서 배점 확인", what_to_show: "개발 목표의 구체성과 기술 난이도" },
      { name: "지역 산업 연계", weight_text: "공고에서 배점 확인", what_to_show: "지역 주력 산업·수요기업과의 연결" },
      { name: "수행 역량", weight_text: "공고에서 배점 확인", what_to_show: "인력·장비·협력기관" },
    ],
    sections: [
      { heading: "1. 기업 개요", purpose: "회사와 사업장 위치를 정리합니다.", criteria: [1],
        template: `${COMPANY}\n\n{{business_direction}}`, tips: ["광주 소재 본사 또는 기업부설연구소 여부를 명확히 적으세요."] },
      { heading: "2. 기술개발 필요성", purpose: "왜 이 개발이 필요한지 설명합니다.", criteria: [0],
        template: "{{lib:problem}}\n\n[[기존 기술·제품의 한계와 국내외 기술 동향]]", tips: ["수요기업의 요구가 있으면 그 내용을 적으세요."] },
      { heading: "3. 개발 목표와 내용", purpose: "무엇을 어디까지 개발할지 정합니다.", criteria: [0],
        template: "{{lib:solution}}\n\n[[정량 목표 (성능 지표와 목표치)]]\n\n{{lib:schedule}}", tips: ["목표는 측정 가능한 수치로 쓰세요."] },
      { heading: "4. 지역 산업 연계와 사업화", purpose: "지역 산업과의 연결을 보여줍니다.", criteria: [1],
        template: "목표 고객\n{{lib:customer}}\n\n{{lib:market}}\n\n[[광주 지역 수요기업·기관과의 협력 계획]]", tips: ["지역 기업의 구매의향서가 있으면 큰 강점입니다."] },
      { heading: "5. 수행 역량과 자금 계획", purpose: "해낼 수 있음을 보여줍니다.", criteria: [2],
        template: "{{lib:team}}\n\n보유 실적\n{{lib:traction}}\n\n{{lib:budget}}", tips: ["기업부설연구소·연구전담부서 보유 여부를 적으세요."] },
      { heading: "6. 신청 자격 충족 현황", purpose: "공고의 신청 자격을 요건별로 확인합니다.", criteria: [],
        template: "{{eligibility_summary}}", tips: ["'지역 우수기업 우선 선정'의 기준은 주관기관에 확인이 필요합니다."] },
    ],
    warnings: ["공고문에 '지역 우수기업 우선 선정'이 있으나 기준이 명시되어 있지 않습니다. 주관기관에 문의하세요."],
  },
  "seed-17": {
    title: "전남 청년창업 활성화 지원 사업계획서",
    overview: "전남 지역 청년 창업기업의 초기 사업화를 지원합니다. 아이템의 실현 가능성과 지역 정착 계획을 봅니다.",
    evaluation_criteria: [
      { name: "사업 아이템", weight_text: "공고에서 배점 확인", what_to_show: "문제 정의와 해결 방법" },
      { name: "실현 가능성", weight_text: "공고에서 배점 확인", what_to_show: "일정·자금 계획과 현재 진행 상황" },
      { name: "지역 정착", weight_text: "공고에서 배점 확인", what_to_show: "전남에서의 사업 운영·고용 계획" },
    ],
    sections: [
      { heading: "1. 창업자와 기업 개요", purpose: "대표자와 회사를 소개합니다.", criteria: [],
        template: `${COMPANY}\n\n{{lib:team}}`, tips: [] },
      { heading: "2. 사업 아이템", purpose: "무엇을 하는 사업인지 설명합니다.", criteria: [0],
        template: "{{lib:problem}}\n\n{{lib:solution}}\n\n{{lib:differentiation}}", tips: ["지역 자원·특산물과 연계되면 그 점을 강조하세요."] },
      { heading: "3. 목표 고객과 판로", purpose: "어떻게 팔지 밝힙니다.", criteria: [0],
        template: "목표 고객\n{{lib:customer}}\n\n{{lib:market}}\n\n[[판매 채널과 확보 현황]]", tips: ["이미 확보한 거래처가 있으면 먼저 적으세요."] },
      { heading: "4. 추진 일정과 자금 계획", purpose: "지원금 사용 계획을 적습니다.", criteria: [1],
        template: "{{lib:schedule}}\n\n{{lib:budget}}", tips: ["자부담 비율을 공고에서 확인하세요."] },
      { heading: "5. 지역 정착 계획", purpose: "전남에서 이어갈 계획을 보여줍니다.", criteria: [2],
        template: "{{lib:impact}}\n\n[[전남 사업장 운영·고용 계획]]", tips: [] },
      { heading: "6. 신청 자격 충족 현황", purpose: "공고의 신청 자격을 요건별로 확인합니다.", criteria: [],
        template: "{{eligibility_summary}}", tips: [] },
    ],
    warnings: ["지원 기간 중 사업장을 전남 밖으로 옮기면 지원이 중단될 수 있습니다."],
  },
  "seed-18": {
    title: "소상공인 위생·시설 개선 지원 신청서",
    overview: "식품을 다루는 소상공인의 위생·시설 개선 비용을 지원합니다. 무엇을 왜 고치는지와 개선 뒤의 변화가 핵심입니다.",
    evaluation_criteria: [
      { name: "개선 필요성", weight_text: "공고에서 배점 확인", what_to_show: "현재 시설의 문제와 위생상 위험" },
      { name: "개선 계획", weight_text: "공고에서 배점 확인", what_to_show: "공사·장비 내역과 견적" },
    ],
    sections: [
      { heading: "1. 사업장 개요", purpose: "사업장과 영업신고 현황을 적습니다.", criteria: [],
        template: `${COMPANY}\n\n[[영업신고 종류와 신고일, 사업장 면적]]`, tips: ["영업신고증 사본이 필요합니다."] },
      { heading: "2. 현재 시설의 문제", purpose: "무엇이 문제인지 보여줍니다.", criteria: [0],
        template: "{{lib:problem}}\n\n[[현재 시설 상태와 위생상 문제 (사진 첨부 권장)]]", tips: ["점검에서 지적받은 사항이 있으면 적으세요."] },
      { heading: "3. 개선 계획과 소요 비용", purpose: "무엇을 고칠지 적습니다.", criteria: [1],
        template: "[[개선할 항목별 내역과 견적 금액]]\n\n{{lib:budget}}\n\n{{lib:schedule}}", tips: ["견적서는 2개 이상 받아 두면 좋습니다."] },
      { heading: "4. 개선 후 기대효과", purpose: "개선 뒤 달라질 점을 제시합니다.", criteria: [0],
        template: "{{lib:impact}}", tips: ["위생 등급·고객 만족도 등 확인 가능한 지표로 적으세요."] },
      { heading: "5. 신청 자격 충족 현황", purpose: "공고의 신청 자격을 요건별로 확인합니다.", criteria: [],
        template: "{{eligibility_summary}}", tips: [] },
    ],
    warnings: ["지원 결정 전에 먼저 공사를 하면 인정되지 않는 경우가 많습니다. 집행 순서를 확인하세요."],
  },
  "seed-19": {
    title: "소공인 특화자금 신청서",
    overview: "제조업 소공인의 설비·운전 자금을 융자로 지원합니다. 설비 투자 계획과 상환 능력을 봅니다.",
    evaluation_criteria: [
      { name: "자금 필요성", weight_text: "공고에서 배점 확인", what_to_show: "설비·운전자금이 필요한 사유와 금액" },
      { name: "상환 능력", weight_text: "공고에서 배점 확인", what_to_show: "매출 추이와 상환 계획" },
    ],
    sections: [
      { heading: "1. 사업장 개요", purpose: "제조 현황을 정리합니다.", criteria: [],
        template: `${COMPANY}\n\n{{lib:solution}}`, tips: ["제조업 여부와 상시근로자 10인 미만 기준을 확인하세요."] },
      { heading: "2. 자금 필요성", purpose: "왜 자금이 필요한지 설명합니다.", criteria: [0],
        template: "현재 상황\n{{lib:traction}}\n\n[[필요 설비·운전자금의 내역과 금액, 견적 근거]]", tips: ["설비는 견적서를, 운전자금은 원재료 구매 계획을 근거로 드세요."] },
      { heading: "3. 자금 사용과 추진 일정", purpose: "사용 계획을 적습니다.", criteria: [0],
        template: "{{lib:budget}}\n\n{{lib:schedule}}", tips: [] },
      { heading: "4. 상환 계획과 기대효과", purpose: "갚을 수 있음을 보여줍니다.", criteria: [1],
        template: "{{lib:impact}}\n\n[[월 예상 매출과 상환 재원]]", tips: ["설비 도입 후 생산량 증가를 수치로 추정하세요."] },
      { heading: "5. 신청 자격 충족 현황", purpose: "공고의 신청 자격을 요건별로 확인합니다.", criteria: [],
        template: "{{eligibility_summary}}", tips: [] },
    ],
    warnings: ["융자는 갚아야 하는 자금입니다. 금리와 상환 기간을 확인하세요.", "국세·지방세 체납이 있으면 신청할 수 없습니다."],
  },
  "seed-20": {
    title: "벤처기업 R&D 세액공제 컨설팅 지원 신청서",
    overview: "벤처기업이 연구개발비 세액공제를 제대로 받을 수 있도록 컨설팅을 지원합니다. 연구개발 활동의 실재와 컨설팅 필요성을 봅니다.",
    evaluation_criteria: [
      { name: "연구개발 활동", weight_text: "공고에서 배점 확인", what_to_show: "실제 수행 중인 연구개발과 관련 지출" },
      { name: "컨설팅 필요성", weight_text: "공고에서 배점 확인", what_to_show: "세액공제 적용에서 겪는 어려움" },
    ],
    sections: [
      { heading: "1. 기업 개요", purpose: "회사와 인증 현황을 적습니다.", criteria: [],
        template: `${COMPANY}\n\n보유 인증: {{certifications}}`, tips: ["벤처기업확인서 유효기간을 확인하세요."] },
      { heading: "2. 연구개발 활동 현황", purpose: "무엇을 개발하고 있는지 보여줍니다.", criteria: [0],
        template: "{{lib:solution}}\n\n[[연구개발 인력 수와 연구개발비 규모 (최근 사업연도 기준)]]", tips: ["연구노트·개발 산출물이 있으면 적으세요."] },
      { heading: "3. 컨설팅이 필요한 이유", purpose: "어떤 도움이 필요한지 밝힙니다.", criteria: [1],
        template: "{{lib:problem}}\n\n[[세액공제 적용에서 겪는 구체적 어려움 (비용 구분·증빙 등)]]", tips: ["과거 공제 신청 경험과 결과를 적으면 좋습니다."] },
      { heading: "4. 기대효과", purpose: "컨설팅 후 목표를 제시합니다.", criteria: [1],
        template: "{{lib:impact}}", tips: [] },
      { heading: "5. 신청 자격 충족 현황", purpose: "공고의 신청 자격을 요건별로 확인합니다.", criteria: [],
        template: "{{eligibility_summary}}", tips: ["벤처기업확인서 사본이 필요합니다."] },
    ],
    warnings: ["세액공제는 요건이 까다롭습니다. 컨설팅 결과와 별개로 최종 판단은 세무 대리인과 하세요."],
  },
  "seed-23": {
    title: "청년창업사관학교 졸업기업 후속지원 사업계획서",
    overview: "청년창업사관학교를 수료한 기업의 다음 단계를 지원합니다. 수료 이후의 성장과 이번 지원으로 무엇을 더 할지가 핵심입니다.",
    evaluation_criteria: [
      { name: "졸업 이후 성장", weight_text: "공고에서 배점 확인", what_to_show: "수료 이후의 매출·고용·투자 변화" },
      { name: "후속 계획", weight_text: "공고에서 배점 확인", what_to_show: "이번 지원으로 달성할 구체적 목표" },
      { name: "실행 역량", weight_text: "공고에서 배점 확인", what_to_show: "팀 구성과 자금 계획" },
    ],
    sections: [
      { heading: "1. 기업 개요와 수료 이력", purpose: "회사와 사관학교 이력을 적습니다.", criteria: [],
        template: `${COMPANY}\n\n[[청년창업사관학교 기수와 수료 시기, 당시 과제명]]`, tips: ["수료증·협약서 사본이 필요합니다."] },
      { heading: "2. 수료 이후의 성과", purpose: "그동안의 변화를 보여줍니다.", criteria: [0],
        template: "{{lib:traction}}\n\n[[수료 시점 대비 매출·고용·투자 변화 (수치로)]]", tips: ["수료 시점과 현재를 나란히 비교하세요."] },
      { heading: "3. 제품과 시장", purpose: "현재 사업 내용을 정리합니다.", criteria: [1],
        template: "{{lib:solution}}\n\n{{lib:differentiation}}\n\n{{lib:market}}", tips: [] },
      { heading: "4. 후속 지원 활용 계획", purpose: "이번 지원으로 할 일을 적습니다.", criteria: [1],
        template: "{{lib:schedule}}\n\n{{lib:budget}}", tips: ["수료 당시 과제의 연장선임을 보여주면 설득력이 있습니다."] },
      { heading: "5. 팀과 기대효과", purpose: "실행 역량과 목표를 제시합니다.", criteria: [2],
        template: "{{lib:team}}\n\n{{lib:impact}}", tips: [] },
      { heading: "6. 신청 자격 충족 현황", purpose: "공고의 신청 자격을 요건별로 확인합니다.", criteria: [],
        template: "{{eligibility_summary}}", tips: [] },
    ],
    warnings: ["졸업기업 여부는 수료증으로 증빙해야 합니다.", "수료 후 경과 기간 제한이 있는지 공고에서 확인하세요."],
  },
};
