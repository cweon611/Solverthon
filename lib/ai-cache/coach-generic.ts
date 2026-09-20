// lib/ai-cache/coach-generic.ts — 실공고 요건에 대한 코치 설명 (AI: Claude Opus 5가 개발 중 작성)
//
// 실공고의 요건 문구는 공고마다 제각각이라 한 건씩 손으로 쓸 수 없다. 대신 요건을 유형으로 나눠
// 유형별 설명을 써 두고, 공고의 실제 기준 문구를 그 안에 넣는다. 사실은 공고에서 오고, 설명은 여기서 온다.
// 시드 공고용 COACH_ITEMS(정확히 일치하는 항목)가 우선이고, 없을 때 이 규칙이 쓰인다.

import type { AuthoredCoachItem } from "./authored";

export interface Row {
  label: string;
  required: string;
  state: "fail" | "check";
}

type Kind =
  | "region" | "age" | "ceoAge" | "employees" | "gender" | "industry" | "revenue"
  | "export" | "cert" | "prior" | "tax" | "preStartup" | "hiring" | "unmapped";

function classify(row: Row): Kind {
  const s = `${row.label} ${row.required}`;
  if (/예비창업자|사업자등록을 하지 않은/.test(s)) return "preStartup";
  if (/지역|소재|시·도|본사|사업장/.test(row.label)) return "region";
  if (/업력|창업 \d|창업 후/.test(s)) return "age";
  if (/대표자 (만 )?\d*\s*연령|대표자 만|청년/.test(s)) return "ceoAge";
  if (/상시근로자|직원|고용 인원/.test(s)) return "employees";
  if (/성별|여성/.test(s)) return "gender";
  if (/업종|제조업|분야/.test(row.label)) return "industry";
  if (/매출/.test(s)) return "revenue";
  if (/수출/.test(s)) return "export";
  if (/인증|확인서|벤처|이노비즈|메인비즈/.test(s)) return "cert";
  if (/수혜|중복|졸업기업|기수혜/.test(s)) return "prior";
  if (/체납|세금/.test(s)) return "tax";
  if (/채용/.test(s)) return "hiring";
  return "unmapped";
}

/** 유형별 설명. {기준}에 공고의 실제 요건 문구가 들어간다 */
const BY_KIND: Record<Kind, Omit<AuthoredCoachItem, "phrase"> & { phrase: string }> = {
  region: {
    meaning: "이 공고는 특정 지역에 사업장을 둔 기업만 신청할 수 있습니다(기준: {기준}). 대표자 주소가 아니라 사업자등록증의 사업장 소재지를 봅니다.",
    how_to_meet: [
      "사업자등록증의 사업장 소재지가 공고가 요구하는 지역인지 확인합니다.",
      "해당 지역에 지점·공장·연구소가 있다면 그 사업장으로 신청할 수 있는지 주관기관에 문의합니다.",
      "해당하지 않으면 판정함에서 우리 지역 공고나 전국 대상 공고를 찾습니다.",
    ],
    where_to_check: "공고문 하단의 주관기관 문의처",
    caution: "지원금 때문에 사업장을 옮기는 것은 임차료·인력 문제로 이어집니다. 사업상 이유가 있을 때만 검토하세요.",
    can_fix_now: false,
    next_step: "사업자등록증의 소재지를 확인하고, 같은 분야의 우리 지역 공고를 대신 살펴보세요.",
    phrase: "사업장 소재지 요건이 맞지 않습니다",
  },
  age: {
    meaning: "창업한 지 얼마나 되었는지로 신청 자격을 나눕니다(기준: {기준}). 업력은 사업자등록증의 개업일부터 셉니다.",
    how_to_meet: [
      "사업자등록증의 개업일을 기준으로 현재 업력을 확인합니다.",
      "업력 하한이 있는 사업이라면 자격이 생기는 날짜를 확인해 그 뒤 공고를 노립니다.",
      "업력 상한이 있다면 남은 기간 안에 신청할 수 있는 사업을 먼저 챙깁니다.",
    ],
    where_to_check: "사업자등록증 · 공고 주관기관",
    caution: "업력 기준일이 '공고일'인지 '접수 마감일'인지 공고마다 다릅니다. 경계에 있으면 반드시 확인하세요.",
    can_fix_now: false,
    next_step: "비즈버디의 '곧 사라짐'에서 업력 요건이 언제 바뀌는지 확인해 두세요.",
    phrase: "업력 요건({기준})을 확인해야 합니다",
  },
  ceoAge: {
    meaning: "대표자 나이로 신청 자격을 제한합니다(기준: {기준}). 보통 공고일 또는 접수 마감일 기준의 만 나이로 봅니다.",
    how_to_meet: [
      "공동대표 중 요건에 맞는 대표가 있다면 그 요건으로 신청 가능한지 확인합니다.",
      "프로필에 대표자 생년월일을 넣으면 이 요건이 자동으로 확정됩니다.",
      "해당하지 않으면 연령 제한이 없는 사업을 찾습니다.",
    ],
    where_to_check: "공고 주관기관",
    caution: "나이 기준일이 공고마다 다릅니다. 생일이 가까우면 특히 주의하세요.",
    can_fix_now: true,
    next_step: "프로필에 대표자 생년월일을 입력해 이 요건을 확정하세요.",
    phrase: "대표자 연령 요건({기준})을 확인해야 합니다",
  },
  employees: {
    meaning: "상시근로자 수로 신청 자격을 정합니다(기준: {기준}). 상시근로자는 4대보험에 가입해 계속 일하는 직원이며, 대표자는 보통 제외합니다.",
    how_to_meet: [
      "4대보험 가입자 명부로 현재 인원을 확인합니다.",
      "인원 하한이 있다면 채용 계획과 공고 마감일을 견줘 봅니다.",
      "채용 시 생기는 의무는 비즈버디 직원 시뮬레이터에서 미리 확인하세요.",
    ],
    where_to_check: "4대사회보험 정보연계센터 · 공고 주관기관",
    caution: "인원은 늘리면 고정비가 됩니다. 지원금만 보고 채용하지 마세요.",
    can_fix_now: true,
    next_step: "4대보험 가입자 명부로 현재 인원을 확인하세요.",
    phrase: "상시근로자 요건({기준})을 확인해야 합니다",
  },
  gender: {
    meaning: "대표자 성별로 대상을 정한 사업입니다(기준: {기준}). 실제 신청에서는 여성기업 확인서를 요구하는 경우가 많습니다.",
    how_to_meet: ["공동대표 구성이 요건에 맞는지 확인합니다.", "해당하지 않으면 성별 제한이 없는 사업을 찾습니다."],
    where_to_check: "여성기업종합지원센터 · 공고 주관기관",
    caution: "형식적인 대표자 변경은 사후 점검 대상입니다.",
    can_fix_now: false,
    next_step: "판정함에서 성별 제한이 없는 같은 분야 사업을 확인하세요.",
    phrase: "대표자 성별 요건이 맞지 않습니다",
  },
  industry: {
    meaning: "업종으로 신청 자격을 제한합니다(기준: {기준}). 업종은 사업자등록증의 업태·종목과 한국표준산업분류를 기준으로 봅니다.",
    how_to_meet: [
      "사업자등록증의 업태·종목을 확인합니다.",
      "프로필의 업종을 실제와 같게 고치면 판정이 더 정확해집니다.",
      "제외 업종에 해당하는지 공고문의 제외 업종 목록과 대조합니다.",
    ],
    where_to_check: "홈택스(사업자등록 내역) · 공고 주관기관",
    caution: "지원을 받으려고 업종을 바꾸면 사후 점검에서 문제가 됩니다.",
    can_fix_now: false,
    next_step: "프로필의 업종이 사업자등록증과 같은지 확인하세요.",
    phrase: "업종 요건({기준})을 확인해야 합니다",
  },
  revenue: {
    meaning: "매출 규모로 자격을 정합니다(기준: {기준}). 보통 직전 사업연도 매출을 봅니다.",
    how_to_meet: [
      "홈택스의 부가가치세 신고 내역이나 재무제표에서 매출을 확인합니다.",
      "프로필의 '작년 연매출'에 입력하면 이 요건이 확정됩니다.",
      "창업 첫 해라 실적이 없다면 산정 방법을 주관기관에 확인합니다.",
    ],
    where_to_check: "홈택스 · 공고 주관기관",
    caution: "기준 기간이 '직전 사업연도'인지 '최근 1년'인지 다릅니다.",
    can_fix_now: true,
    next_step: "홈택스에서 작년 매출을 확인해 프로필에 입력하세요.",
    phrase: "매출 요건({기준})을 확인해야 합니다",
  },
  export: {
    meaning: "수출 실적으로 자격을 정합니다(기준: {기준}).",
    how_to_meet: [
      "한국무역협회·관세청에서 수출 실적 증명을 확인합니다.",
      "프로필의 '작년 수출'에 입력하면 이 요건이 확정됩니다.",
      "간접수출(로컬 수출) 인정 여부를 주관기관에 확인합니다.",
    ],
    where_to_check: "한국무역협회 · 관세청 · KOTRA",
    caution: "실적 증명서 발급에 며칠이 걸립니다. 마감 전에 준비하세요.",
    can_fix_now: true,
    next_step: "작년 수출 실적을 확인해 프로필에 입력하세요.",
    phrase: "수출 실적 요건({기준})을 확인해야 합니다",
  },
  cert: {
    meaning: "특정 인증·확인서를 가진 기업이 대상입니다(기준: {기준}). 인증은 신청해서 받는 제도이며 유효기간이 있습니다.",
    how_to_meet: [
      "요구되는 인증의 발급 요건과 절차를 확인합니다.",
      "이미 보유하고 있다면 프로필의 '보유 인증'에 체크하세요.",
      "유효기간이 지났다면 갱신 일정을 확인합니다.",
    ],
    where_to_check: "각 인증 발급 기관 · 공고 주관기관",
    caution: "인증 취득에는 보통 수 주가 걸립니다. 이번 마감에는 못 맞출 수 있습니다.",
    can_fix_now: true,
    next_step: "요구되는 인증의 발급 요건을 확인하고, 보유 중이라면 프로필에 반영하세요.",
    phrase: "인증 요건({기준})을 확인해야 합니다",
  },
  prior: {
    meaning: "이전에 받은 지원 이력으로 자격이 갈립니다(기준: {기준}). 중복 수혜를 막거나, 반대로 특정 사업 수료자만 받는 경우입니다.",
    how_to_meet: [
      "프로필의 '이전 창업 지원'에 받은 사업을 체크하면 판정이 정확해집니다.",
      "같은 계열 사업을 받은 적이 있다면 제한 범위를 공고에서 확인합니다.",
    ],
    where_to_check: "공고 주관기관 · 이전 사업 협약서",
    caution: "수혜 이력은 협약서·수료증으로 증빙해야 합니다.",
    can_fix_now: true,
    next_step: "프로필의 '이전 창업 지원'을 실제와 맞게 고치세요.",
    phrase: "이전 수혜 이력({기준})을 확인해야 합니다",
  },
  tax: {
    meaning: "국세·지방세 체납이 없어야 신청할 수 있습니다(기준: {기준}). 거의 모든 정부 지원사업에 들어가는 조건입니다.",
    how_to_meet: [
      "홈택스와 위택스에서 체납 여부를 확인합니다.",
      "프로필의 '세금 체납'에 답하면 이 요건이 확정됩니다.",
      "체납이 있다면 납부 또는 분납 계획을 세운 뒤 신청합니다.",
    ],
    where_to_check: "홈택스(국세) · 위택스(지방세)",
    caution: "완납증명서 발급일이 신청 기간 안이어야 하는 경우가 많습니다.",
    can_fix_now: true,
    next_step: "홈택스·위택스에서 체납 여부를 확인해 프로필에 입력하세요.",
    phrase: "세금 체납 여부를 확인해야 합니다",
  },
  preStartup: {
    meaning: "아직 사업자등록을 하지 않은 예비창업자가 대상입니다(기준: {기준}). 이미 사업자등록이 있으면 대상이 아닌 경우가 많습니다.",
    how_to_meet: [
      "공고가 예비창업자만 받는지, 초기창업기업도 받는지 확인합니다.",
      "이미 사업자등록이 있다면 창업기업 대상 사업을 찾습니다.",
    ],
    where_to_check: "공고 주관기관",
    caution: "예비창업자 대상 사업에 사업자등록 후 신청하면 선정 취소 사유가 됩니다.",
    can_fix_now: false,
    next_step: "판정함에서 창업기업이 신청할 수 있는 사업을 확인하세요.",
    phrase: "예비창업자 대상 여부를 확인해야 합니다",
  },
  hiring: {
    meaning: "채용 계획이 있는 기업이 대상입니다(기준: {기준}).",
    how_to_meet: [
      "채용 계획이 있다면 프로필의 '채용 계획'을 '있음'으로 바꾸세요.",
      "채용 전 사전 신청이 필요한지 공고에서 확인합니다.",
    ],
    where_to_check: "고용노동부 고용24 · 공고 주관기관",
    caution: "고용장려금은 채용 전에 신청해야 하는 경우가 많습니다.",
    can_fix_now: true,
    next_step: "채용 계획 여부를 정하고, 필요한 사전 신청 절차를 확인하세요.",
    phrase: "채용 계획 요건을 확인해야 합니다",
  },
  unmapped: {
    meaning: "이 조건은 회사 정보만으로는 판단할 수 없어 서비스가 판정을 유보한 항목입니다. 공고 원문에는 이렇게 적혀 있습니다: {기준}",
    how_to_meet: [
      "공고 원문에서 이 문장이 자격 제한인지 우대 사항인지 확인합니다.",
      "판단이 어려우면 공고문 하단의 문의처로 물어봅니다.",
      "해당한다면 증빙 방법도 함께 확인합니다.",
    ],
    where_to_check: "공고문 하단 문의처",
    caution: "확인 없이 자격이 없다고 단정하지 마세요. 우대 사항인 경우가 많습니다.",
    can_fix_now: false,
    next_step: "공고문에서 이 조건의 원문을 찾아 자격 제한인지 확인하세요.",
    phrase: "원문 확인이 필요한 조건이 있습니다",
  },
};

/** 요건 행 하나 → 코치 설명. 공고의 기준 문구를 설명 안에 넣는다 */
export function genericCoachItem(row: Row): AuthoredCoachItem {
  const base = BY_KIND[classify(row)];
  const 기준 = row.required.length > 120 ? `${row.required.slice(0, 120)}…` : row.required;
  const fill = (s: string) => s.replace(/\{기준\}/g, 기준);
  return {
    ...base,
    meaning: fill(base.meaning),
    phrase: fill(base.phrase),
    how_to_meet: base.how_to_meet.map(fill),
  };
}
