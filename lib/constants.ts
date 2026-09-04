// lib/constants.ts — 코드표·토큰 (PRD 부록 C)

import type { Certification, ConditionField, FieldMeta } from "@/lib/types";

// ─── Unsplash image URLs (design/BridgePage.tsx 156–165행 그대로) ─────────────
// lifestyle: natural light, real people
// 3d-cutout: object-only, transparent-bg style shots
// P2: /public/photos/ 로 내려받기
export const PHOTOS = {
  heroLifestyle: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&q=85&fit=crop",
  officeWarm: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&q=85&fit=crop",
  laptopSunlight: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=900&q=85&fit=crop",
  teamMeeting: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&q=85&fit=crop",
  deskDocuments: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=900&q=85&fit=crop",
  personCutout: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=85&fit=crop&crop=faces",
  plantDesk: "https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600&q=85&fit=crop",
  coffeeWork: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=85&fit=crop",
} as const;

// ─── 색·판정 임계값 (부록 C) ────────────────────────────────────────────────
export const EXPIRY_ROSE = 60; // expiresIn ≤ 60 → rose
export const EXPIRY_AMBER = 90; // expiresIn ≤ 90 → amber · 사이드바 배지·"곧 소멸(3개월)" 카드 기준
export const EXPIRY_MAX_DAYS = 365; // "곧 사라짐" 목록 포함 범위 (§6.2)
export const CLOSING_DAYS = 7; // apply_end − today ≤ 7 → 마감임박 (§5.4)
export const TASK_WINDOW = { past: 30, future: 60 } as const; // 할 일 생성 구간 (§6.3)
export const LEADTIME_TIGHT_DAYS = 3; // 0 ≤ latestStart − today ≤ 3 → tight (§6.5)
export const DEDUPE = { duplicate: 0.92, review: 0.85 } as const; // (§6.6)
export const NEAR_MISS_TIME_MONTHS = 12; // time 필드 near-miss 허용 기간 (§6.1)
export const ALERT_DUE_SOON_DAYS = 3; // 0 ≤ dDay ≤ 3 → 임박 의무 배너 (§6.7)

// ─── 지역 코드표 (§7.1 프롬프트의 표와 동일한 코드) ─────────────────────────
export const REGIONS: { code: string; label: string; short: string }[] = [
  { code: "29", label: "광주광역시", short: "광주" },
  { code: "46", label: "전라남도", short: "전남" },
  { code: "11", label: "서울특별시", short: "서울" },
  { code: "26", label: "부산광역시", short: "부산" },
  { code: "27", label: "대구광역시", short: "대구" },
  { code: "28", label: "인천광역시", short: "인천" },
  { code: "30", label: "대전광역시", short: "대전" },
  { code: "31", label: "울산광역시", short: "울산" },
  { code: "36", label: "세종특별자치시", short: "세종" },
  { code: "41", label: "경기도", short: "경기" },
  { code: "51", label: "강원특별자치도", short: "강원" },
  { code: "43", label: "충청북도", short: "충북" },
  { code: "44", label: "충청남도", short: "충남" },
  { code: "52", label: "전북특별자치도", short: "전북" },
  { code: "47", label: "경상북도", short: "경북" },
  { code: "48", label: "경상남도", short: "경남" },
  { code: "50", label: "제주특별자치도", short: "제주" },
];

export const REGION_LABEL: Record<string, string> = Object.fromEntries(REGIONS.map((r) => [r.code, r.label]));

// 전국을 뜻하는 예약 코드 — region_code 조건의 value가 ["ALL"]이면 무조건 pass (§6.1)
export const REGION_ALL = "ALL";

// ─── 업종 코드표: KSIC 대분류 21 + 자주 쓰는 중분류 12 (§8 S0) ───────────────
// code는 prefix 매칭용, label은 사용자 표시용
export const INDUSTRIES: { code: string; label: string }[] = [
  // 자주 쓰는 중분류 (먼저 노출)
  { code: "J62", label: "소프트웨어 개발업" },
  { code: "J63", label: "정보서비스업" },
  { code: "C26", label: "전자부품 제조업" },
  { code: "C10", label: "식료품 제조업" },
  { code: "G47", label: "소매업(온라인 포함)" },
  { code: "I56", label: "음식점업" },
  { code: "M70", label: "전문서비스업" },
  { code: "M71", label: "광고·시장조사업" },
  { code: "M72", label: "디자인·연구개발업" },
  { code: "N75", label: "사업지원 서비스업" },
  { code: "P85", label: "교육 서비스업" },
  { code: "R90", label: "창작·예술 서비스업" },
  // KSIC 대분류 21
  { code: "A", label: "농업, 임업 및 어업" },
  { code: "B", label: "광업" },
  { code: "C", label: "제조업" },
  { code: "D", label: "전기, 가스, 증기 및 공기조절 공급업" },
  { code: "E", label: "수도, 하수 및 폐기물 처리, 원료 재생업" },
  { code: "F", label: "건설업" },
  { code: "G", label: "도매 및 소매업" },
  { code: "H", label: "운수 및 창고업" },
  { code: "I", label: "숙박 및 음식점업" },
  { code: "J", label: "정보통신업" },
  { code: "K", label: "금융 및 보험업" },
  { code: "L", label: "부동산업" },
  { code: "M", label: "전문, 과학 및 기술 서비스업" },
  { code: "N", label: "사업시설 관리, 사업 지원 및 임대 서비스업" },
  { code: "O", label: "공공행정, 국방 및 사회보장 행정" },
  { code: "P", label: "교육 서비스업" },
  { code: "Q", label: "보건업 및 사회복지 서비스업" },
  { code: "R", label: "예술, 스포츠 및 여가관련 서비스업" },
  { code: "S", label: "협회 및 단체, 수리 및 기타 개인 서비스업" },
  { code: "T", label: "가구 내 고용활동 및 달리 분류되지 않은 자가소비 생산활동" },
  { code: "U", label: "국제 및 외국기관" },
];

export const INDUSTRY_LABEL: Record<string, string> = Object.fromEntries(INDUSTRIES.map((i) => [i.code, i.label]));

// ─── 인증 라벨 (부록 C) ─────────────────────────────────────────────────────
export const CERT_LABEL: Record<Certification, string> = {
  venture: "벤처기업 인증",
  innobiz: "이노비즈",
  mainbiz: "메인비즈",
  research_institute: "기업부설연구소",
  social_enterprise: "사회적기업",
  women_enterprise: "여성기업 확인",
  disabled_enterprise: "장애인기업 확인",
};

// ─── 조건 필드 메타 (§5.1) ──────────────────────────────────────────────────
// mutability: fixed(현 상황을 기술 — near-miss 안내 안 함) · mutable(채용으로 변함)
//             · time(시간이 지나면 변함) · acquirable(취득 가능)
export const FIELD_META: FieldMeta = {
  business_type: { label: "사업자 형태", mutability: "fixed" },
  industry_code: { label: "업종", mutability: "fixed" },
  region_code: { label: "지역", mutability: "fixed" },
  business_age_months: { label: "업력", mutability: "time", axis: "업력" },
  employee_count: { label: "직원 수", mutability: "mutable", axis: "직원수" },
  ceo_age: { label: "대표자 연령", mutability: "time", axis: "대표자연령" },
  ceo_gender: { label: "대표자 성별", mutability: "fixed" },
  annual_revenue_krw: { label: "연매출", mutability: "fixed" },
  export_revenue_usd_prev_year: { label: "전년도 수출액", mutability: "fixed" },
  is_vat_exempt: { label: "면세사업자", mutability: "fixed" },
  certifications: { label: "보유 인증", mutability: "acquirable" },
  hiring_planned: { label: "채용 예정", mutability: "fixed" },
  has_online_sales: { label: "온라인 판매", mutability: "fixed" },
  handles_personal_data: { label: "개인정보 처리", mutability: "fixed" },
  is_food_business: { label: "식품 영업", mutability: "fixed" },
};

export const CONDITION_FIELDS = Object.keys(FIELD_META) as ConditionField[];

export function isConditionField(v: unknown): v is ConditionField {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(FIELD_META, v);
}

// 숫자로 비교하는 필드 (lt/lte/gt/gte 대상)
export const NUMERIC_FIELDS: ConditionField[] = [
  "business_age_months",
  "employee_count",
  "ceo_age",
  "annual_revenue_krw",
  "export_revenue_usd_prev_year",
];

// boolean 필드 — null 검사 대상에서 제외 (§6.1)
export const BOOLEAN_FIELDS: ConditionField[] = [
  "is_vat_exempt",
  "hiring_planned",
  "has_online_sales",
  "handles_personal_data",
  "is_food_business",
];

// ─── 서류명 동의어 (§7.1 후처리) ────────────────────────────────────────────
// key·value 모두 정규화(공백·괄호 제거) 전의 표기. 매칭은 normalizeDocName() 후 비교한다.
export const DOC_ALIASES: Record<string, string> = {
  "중소기업(소상공인)확인서": "중소기업확인서",
  "중소기업·소상공인 확인서": "중소기업확인서",
  "사업자등록증명원": "사업자등록증명",
  "사업자등록증": "사업자등록증명",
};
