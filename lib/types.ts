// lib/types.ts — 도메인 타입의 단일 출처 (PRD §5)
// 디자인(design/BridgePage.tsx)의 뷰모델 타입은 유지하고 필드만 추가한다 (§5.4).

// ─── §5.1 기업 프로필 ────────────────────────────────────────────────────────

export type Certification =
  | "venture"
  | "innobiz"
  | "mainbiz"
  | "research_institute"
  | "social_enterprise"
  | "women_enterprise"
  | "disabled_enterprise";

// 사용자가 입력·저장하는 값 (localStorage "bridge:profile:v1")
export interface CompanyProfile {
  id: string; // crypto.randomUUID()
  name: string; // "테크스타트 주식회사" (선택 입력, 없으면 "내 회사")
  biz_no: string | null; // "234-86-01827" (선택, 표시용. 검증·조회 안 함)
  business_type: "individual" | "corporation";
  industry_code: string; // KSIC 대분류+중분류, 예 "J62"
  industry_label: string; // "소프트웨어 개발업"
  region_code: string; // 시도 코드: "11" 서울 · "29" 광주 · "46" 전남 …
  region_label: string; // "광주광역시"
  founded_at: string; // "YYYY-MM-DD" (개업일. 미래 날짜 입력 차단)
  employee_count: number; // 상시근로자 수 (대표 제외), 0 이상
  ceo_birth_date: string | null; // "YYYY-MM-DD" (null → 연령 조건은 needs_check)
  ceo_gender: "male" | "female" | null;
  annual_revenue_krw: number | null; // null = "모름" (needs_check)
  export_revenue_usd_prev_year: number | null;
  is_vat_exempt: boolean;
  certifications: Certification[];
  flags: {
    hiring_planned: boolean; // 채용 예정 → 이벤트형 노무 의무 노출
    has_online_sales: boolean; // 통신판매업 신고 축
    handles_personal_data: boolean; // 개인정보처리방침 축
    is_food_business: boolean; // 식품 영업신고 축
  };
  /** 창업가가 말한 사업 방향·계획 (대화형 온보딩에서 수집, 신청서 초안 프리필에 사용). 선택 */
  business_direction?: string | null;
  created_at: string;
  updated_at: string;
}

// 엔진이 조건과 대조하는 평탄화 뷰 — 파생값은 저장하지 않고 매번 계산
export interface FlatProfile {
  business_type: "individual" | "corporation";
  industry_code: string; // "J62" — 조건은 대분류("J") 또는 중분류("J62")로 매칭 (prefix)
  region_code: string;
  founded_at: string; // 원본 날짜 (near-miss·소멸 날짜 메시지 계산용, 조건 필드로는 쓰지 않음)
  ceo_birth_date: string | null; // 원본 날짜 (같은 용도)
  business_age_months: number; // today - founded_at (월, 내림)
  employee_count: number;
  ceo_age: number | null; // 만 나이 (오늘 기준)
  ceo_gender: "male" | "female" | null;
  annual_revenue_krw: number | null;
  export_revenue_usd_prev_year: number | null;
  is_vat_exempt: boolean;
  certifications: Certification[];
  hiring_planned: boolean;
  has_online_sales: boolean;
  handles_personal_data: boolean;
  is_food_business: boolean;
}

// Condition.field에 허용되는 키
export type ConditionField = Exclude<keyof FlatProfile, "founded_at" | "ceo_birth_date">;

// 조건 필드별 메타 — near-miss 판정과 "곧 사라짐" 축 계산에 사용. 타입은 여기, 값은 lib/constants.ts
export type ExpiryAxis = "업력" | "대표자연령" | "직원수";
export type FieldMeta = Record<
  ConditionField,
  {
    label: string; // "업력" | "직원 수" | "대표자 연령" …
    mutability: "fixed" | "mutable" | "time" | "acquirable";
    axis?: ExpiryAxis; // 소멸 축 (time/mutable 필드만)
  }
>;

// ─── §5.2 지원사업(Program)과 조건 스키마 ───────────────────────────────────

export type Operator = "lt" | "lte" | "gt" | "gte" | "eq" | "neq" | "in" | "not_in" | "includes";

export interface Condition {
  field: ConditionField;
  op: Operator;
  value: number | string | boolean | string[];
  label: string; // 사용자에게 보여줄 요건 문구: "업력 3년 이상 7년 이하" (AI가 생성)
  source_text: string; // 공고 원문에서 근거가 된 문장 그대로 ← 투명성의 핵심
}
export interface ConditionGroup {
  operator: "AND" | "OR";
  conditions: (Condition | ConditionGroup)[];
}
export interface UnmappedCondition {
  text: string;
  reason: string;
} // AI가 필드에 매핑하지 못한 원문 조건

export type SupportField = "창업" | "R&D" | "수출" | "고용" | "금융" | "내수" | "경영" | "기타";
// UI 필터는 디자인의 5개(창업/R&D/수출/고용/금융)를 그대로 두고, 나머지 3개는 "기타"로 묶어 노출

export interface Program {
  id: string; // uuid
  source: "kstartup" | "bizinfo" | "local" | "synthetic";
  source_id: string | null; // K-Startup pbanc_sn · 기업마당 pblancId
  title: string;
  organization: string; // 공고기관
  executing_org: string | null;
  support_field: SupportField;
  support_type: string | null; // "사업화 자금 + 멘토링"
  amount_text: string | null; // "최대 3억원"
  summary: string | null; // ≤ 200자 (AI 요약)
  apply_start: string | null; // YYYY-MM-DD
  apply_end: string | null; // YYYY-MM-DD (is_rolling이면 null)
  is_rolling: boolean; // 상시 접수
  original_url: string | null;
  apply_url: string | null;
  /** 공식 API가 JSON으로 직접 준 첨부파일(hwpx·pdf) 링크. 없으면 null — "원문 링크 없음" 처리 그대로 */
  attachment_url: string | null;
  eligibility: ConditionGroup; // AI 생성 → 사람 검수
  unmapped_conditions: UnmappedCondition[];
  required_documents: ProgramDocument[];
  review_status: "ai_draft" | "human_verified";
  is_synthetic: boolean; // 시드(합성) 여부 — 공개 배포는 true만 노출
  duplicate_of: string | null; // canonical program id
  parsed_at: string | null;
  created_at: string;
  updated_at: string;
}

// 서버 전용 행 타입 — 클라이언트/뷰모델로 절대 내려보내지 않는다
export interface ProgramRow extends Program {
  raw_text: string | null;
  /** 첨부파일에서 뽑은 본문 발췌(최대 6000자). raw_text와 함께 파싱 입력이 된다. 클라이언트로 내려가지 않는다 */
  attachment_text: string | null;
  embedding: number[] | null;
  parse_model: string | null;
  parse_error: string | null;
}

export interface DocumentType {
  // 서류 카탈로그 (사람이 확인해 입력, AI 추정 금지)
  id: string; // "sme_confirmation"
  name: string; // "중소기업확인서"
  issuer: string; // "중소기업현황정보시스템(sminfo)"
  lead_time_days: number | null; // 20 · null = "소요기간 확인 필요"
  issue_url: string | null;
  verified_at: string | null; // 소요기간 확인일
}
export interface ProgramDocument {
  document_type_id: string | null; // 카탈로그 매칭 실패 시 null → leadTime 'unknown'
  name: string; // 공고 원문 표기
  source_text: string;
  is_required: boolean;
}

// ─── §5.3 법정의무(Obligation)와 스케줄 ─────────────────────────────────────

export type ObligationCategory = "labor" | "tax" | "permit" | "privacy" | "insurance";

export type ScheduleRule =
  | { type: "monthly"; day: number } // 원천세: 매월 10일
  | { type: "quarterly"; months: number[]; day: number } // 법인 부가세: [1,4,7,10] 25일
  | { type: "semiannual"; months: number[]; day: number } // 개인 일반과세 부가세: [1,7] 25일
  | { type: "annual"; month: number; day: number } // 종합소득세: 5월 31일
  | {
      type: "event_relative";
      event: "hire" | "wage_payment" | "business_start" | "employee_leave" | "threshold_reached";
      offset_days: number | null;
      label: string;
    } // 4대보험 취득신고: hire +14일 · 근로계약서: hire +0 "채용 즉시"
  | { type: "once"; date: string };

export interface Obligation {
  id: string; // "OBL-LABOR-001"
  category: ObligationCategory;
  title: string; // "원천세 신고·납부"
  what: string; // 무엇을 해야 하는가 (1문장)
  penalty: string; // "미신고 시 가산세 20%" (디자인 뱃지 문구)
  authority: string; // "국세청"
  legal_basis: { law_name: string; article: string; jo_code: string } | null;
  legal_text_excerpt: string | null; // verify-law.ts가 채움
  legal_checked_at: string | null; // 확인일 — null이면 UI "확인 중" 배지
  how_to_url: string | null;
  applies_if: ConditionGroup; // 이 프로필에 해당하는가 (예: employee_count gte 1)
  schedule: ScheduleRule;
  importance: "high" | "normal"; // high = 캘린더 "중요 법정의무" (penalty 있는 항목)
}

// ─── §5.4 UI 뷰모델 — 디자인 타입을 유지하며 확장 (lib/view/*가 생성) ─────────

export type GrantStatus = "pass" | "fail" | "conditional"; // 디자인 유지

export interface EligibilityCriteria {
  // 디자인 + 확장
  label: string;
  required: string;
  current: string;
  pass: boolean;
  state: "pass" | "fail" | "check"; // check = needs_check (pass=false)
  sourceText: string; // 행 클릭 시 펼침
}

export interface Grant {
  // 디자인 + 확장
  id: string;
  name: string;
  agency: string;
  amount: string;
  deadline: string;
  status: GrantStatus;
  failReason?: string;
  nearMissReason?: string;
  eligibility?: EligibilityCriteria[];
  supportType?: string;
  description?: string;
  subStatus?: "near_miss" | "needs_check"; // conditional의 사유 구분
  checkReasons?: string[]; // needs_check 목록 (unmapped 포함)
  originalUrl?: string;
  applyUrl?: string;
  attachmentUrl?: string;
  reviewStatus: "ai_draft" | "human_verified";
  hasDocuments: boolean;
  /** 시연용 합성 공고인가. 실제 공고 페이지가 없어 원문 링크가 포털 목록으로 간다 */
  isSynthetic: boolean;
}

export type AnnouncementStatus = "open" | "closing" | "closed";
// 공고 목록 칩: 디자인의 5개 + "기타"(SupportField의 내수·경영·기타를 묶음)
export type AnnouncementField = "창업" | "R&D" | "수출" | "고용" | "금융" | "기타";

export interface Announcement {
  // 디자인 + 확장
  id: string;
  title: string;
  agency: string;
  field: AnnouncementField;
  amount: string;
  startDate: string; // 표시용 "YYYY.MM.DD" | "상시"
  endDate: string;
  status: AnnouncementStatus;
  eligible: boolean;
  verdict: GrantStatus;
  originalUrl?: string;
  attachmentUrl?: string;
  createdAt: string; // 정렬용 ISO
  sortEnd: string | null; // 정렬용 ISO (상시 → null)
  dualListed?: boolean; // 중복 병합된 canonical ("기업마당·K-Startup 동시 게시" 뱃지)
  isSynthetic: boolean; // 시연용 합성 공고
}

export interface Task {
  // 디자인 + 확장
  id: string; // "OBL-TAX-001:2026-09-10" | "custom:<uuid>"
  title: string;
  type: "date" | "event";
  dueDate: string; // 표시 문자열 (날짜형은 "YYYY.MM.DD", 이벤트형은 문구)
  authority: string;
  penalty: string;
  done: boolean;
  obligationId?: string;
  dueDateIso?: string; // 캘린더 매칭·정렬용 ISO
  legalCheckedAt?: string | null;
  howToUrl?: string | null;
  overdue?: boolean;
  importance?: "high" | "normal"; // 캘린더 "중요 법정의무"는 importance === 'high' (§4.5-17)
}

// 할 일 폼 입력값 (TaskForm · MiniForm 공용)
export type TaskDraft = Pick<Task, "title" | "type" | "dueDate" | "authority" | "penalty">;

export interface ExpiringItem {
  // 디자인 + 확장
  id: string;
  grantName: string;
  expiresIn: number | null; // null = 이벤트형(채용 시) 소멸
  reason: string;
  axis: ExpiryAxis;
  programId: string;
  expiresOn: string | null;
  applyDeadline: string | null;
}

export interface Company {
  // 디자인 유지 (toCompany(profile)가 생성) + ageMonths 추가 (§4.5-23 "업력 N개월" 표기용)
  name: string;
  bizNo: string;
  sector: string;
  region: string;
  employees: number;
  foundedDate: string; // 표시용 "YYYY.MM.DD"
  ceoAge: number | null;
  yearsOld: number;
  ageMonths: number;
}

// 판정 이력 1행 (localStorage "bridge:history:v1")
export interface HistoryEntry {
  date: string; // 표시용 "YYYY.MM.DD"
  event: string;
  result: string;
}

// 대시보드 배너 1건 (§6.7 pickTopAlert 결과)
export interface TopAlert {
  kind: "overdue" | "due_soon" | "expiring" | "closing";
  priority: number;
  title: string;
  subtitle: string;
  href: "/expiring" | "/tasks" | "/grants";
}

// 직원 시뮬레이터 화면 뷰모델 (§6.4 SimulationDiff → 제목 목록)
export interface SimulationView {
  from: number;
  to: number;
  crossedThresholds: number[];
  newObligations: string[];
  removedObligations: string[];
  lostPrograms: string[];
  gainedPrograms: string[];
}

// 카탈로그 메타 (사이드바 푸터 "공고 동기화" 표기용)
export interface CatalogMeta {
  mode: "seed" | "supabase";
  syncedAt: string | null; // ISO datetime · seed 모드는 null(요청 시점 기준)
}
