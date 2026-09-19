// lib/draft/library.ts — "내 사업 정보": 신청서마다 반복되는 서술형 답을 한 번 받아 모든 초안에 재사용한다.
// 값은 사용자가 쓴 문장 그대로다. 브라우저(localStorage)와 계정 동기화에만 저장하고, LLM에는 보내지 않는다 (§0.1-4).
//
// 템플릿에서는 {{lib:키}}로 참조한다. 값이 없으면 [[입력 필요: 라벨]] 빈칸이 되고,
// 나중에 값을 채우면 이미 사용자가 고친 문단 안의 같은 빈칸도 함께 채워진다.

export const LIB_KEYS = [
  "problem", "customer", "solution", "differentiation", "market",
  "traction", "team", "schedule", "budget", "impact",
] as const;
export type LibKey = (typeof LIB_KEYS)[number];

export type Library = Partial<Record<LibKey, string>>;

export interface LibField {
  label: string; // 빈칸·폼 라벨 — [[입력 필요: 라벨]]과 정확히 같아야 한다
  guide: string; // 무엇을 쓰는가
  example: string;
  minChars: number; // 이보다 짧으면 "보강 권장"
}

export const LIB_FIELDS: Record<LibKey, LibField> = {
  problem: {
    label: "해결하려는 문제",
    guide: "누가, 어떤 상황에서, 무엇 때문에 불편·손해를 겪는지. 가능하면 숫자로.",
    example: "광주·전남 소규모 카페 사장님은 원두·우유 재고를 수기로 관리해 월평균 12%를 폐기합니다.",
    minChars: 60,
  },
  customer: {
    label: "목표 고객",
    guide: "처음 팔 고객이 누구인지 구체적으로(업종·규모·지역). 고객 인터뷰·설문 결과가 있으면 함께.",
    example: "직원 5인 미만 개인 카페 (광주·전남 약 ○천 곳 — 출처 표기). 사장님 20명 인터뷰에서 17명이 재고 관리를 1순위 불편으로 꼽음.",
    minChars: 40,
  },
  solution: {
    label: "제품·서비스",
    guide: "무엇을 만들어 어떻게 문제를 푸는지. 현재 개발 단계(아이디어·시제품·출시)도 함께.",
    example: "POS 매출 데이터로 재고 소진 시점을 예측해 발주를 알려주는 모바일 앱. 현재 시제품으로 카페 3곳에서 시험 운영 중.",
    minChars: 60,
  },
  differentiation: {
    label: "차별성·경쟁력",
    guide: "비슷한 서비스·대체 수단과 비교해 무엇이 다른지. 특허·기술·데이터·네트워크 등 따라 하기 어려운 점.",
    example: "기존 재고 앱은 품목을 직접 입력해야 하지만, 우리는 POS 연동으로 입력 없이 자동 계산합니다.",
    minChars: 40,
  },
  market: {
    label: "시장 규모",
    guide: "목표 시장의 크기와 그 숫자의 출처(통계청·협회·보고서).",
    example: "전국 커피전문점 약 ○만 곳(출처: ○○ 조사, 연도), 그중 5인 미만 개인 매장 비중 ○%.",
    minChars: 30,
  },
  traction: {
    label: "현재 성과",
    guide: "매출·고객 수·계약·수상·특허 등 지금까지의 실적. 없으면 검증 활동(인터뷰·시범 운영)이라도.",
    example: "시범 운영 카페 3곳에서 폐기율 12% → 7%. 유료 전환 의향 2곳.",
    minChars: 20,
  },
  team: {
    label: "팀 구성·역량",
    guide: "대표와 핵심 인력의 경력, 이 사업을 할 수 있는 이유. 채용 예정 인력도.",
    example: "대표: 카페 운영 5년. CTO: 모바일 앱 개발 7년. 연내 백엔드 개발자 1명 채용 예정.",
    minChars: 30,
  },
  schedule: {
    label: "추진 일정",
    guide: "협약 기간 안에 무엇을 언제까지 할지 단계별로.",
    example: "1~3개월 POS 연동 개발 · 4~6개월 20개 매장 베타 · 7~9개월 유료 출시.",
    minChars: 30,
  },
  budget: {
    label: "자금 사용 계획",
    guide: "지원금과 자부담을 어디에 얼마 쓸지 항목별로(인건비·외주·재료·마케팅 등).",
    example: "외주 개발 3,000만 원 · 서버 400만 원 · 마케팅 600만 원 (자부담 10% 포함).",
    minChars: 30,
  },
  impact: {
    label: "기대효과·고용 계획",
    guide: "지원 후 달라질 매출·고객·고용. 몇 명을 언제 채용할지.",
    example: "1년 차 유료 매장 200곳, 연매출 1.2억 원. 개발 1명·영업 1명 신규 채용.",
    minChars: 30,
  },
};

export const LIB_LABEL_TO_KEY: Record<string, LibKey> = Object.fromEntries(
  LIB_KEYS.map((k) => [LIB_FIELDS[k].label, k]),
) as Record<string, LibKey>;

/** 얼마나 채웠는가 — 폼 머리의 진행 표시 */
export function libraryProgress(lib: Library): { filled: number; total: number; short: LibKey[] } {
  const filled = LIB_KEYS.filter((k) => (lib[k] ?? "").trim().length > 0);
  const short = filled.filter((k) => (lib[k] ?? "").trim().length < LIB_FIELDS[k].minChars);
  return { filled: filled.length, total: LIB_KEYS.length, short };
}
