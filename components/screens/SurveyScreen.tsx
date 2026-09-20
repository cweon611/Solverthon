"use client";

// 회원 정보 설문 (신규 가입 · 프로필 수정 공용) — 한 화면에 한 질문, 고르면 바로 다음으로.
// LLM을 쓰지 않는다. 답은 lib/survey/survey.ts가 검증·변환하고, 판정은 엔진이 한다.
// 오른쪽 패널은 지금까지의 답으로 판정을 미리 돌려 "이 질문에 답하면 몇 건이 확정되는지"를 보여준다.

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { chip, selectCard } from "@/components/ui/button-variants";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { progressIndicatorClass, progressTrackClass } from "@/components/ui/variants";
import { CERT_LABEL, PRIOR_SUPPORT_LABEL, REGIONS, INDUSTRY_LABEL } from "@/lib/constants";
import { loadDemoProfiles, toStoredProfile } from "@/lib/data/demoProfiles";
import { fmtDate, fmtMonths, fromIso, isoToDot, monthsBetween, toIso } from "@/lib/engine/format";
import { useCatalog, useHistory, useProfile, useToday } from "@/lib/store/hooks";
import { usePersistent } from "@/lib/store/persistent";
import { STORAGE_KEYS } from "@/lib/store/storage";
import {
  EMPTY_ANSWERS,
  answersFromProfile,
  answersToProfile,
  birthError,
  foundedError,
  isBroadIndustry,
  missingRequired,
  preview,
  programsUsing,
  searchIndustries,
  type Answers,
} from "@/lib/survey/survey";
import type { Certification, ConditionField, PriorSupport } from "@/lib/types";
import { cn } from "@/lib/utils";
import { announcementStatus } from "@/lib/view/toAnnouncement";

// ─── 질문 목록 ───────────────────────────────────────────────────────────────

type QId =
  | "name" | "type" | "industry" | "region" | "founded" | "employees"
  | "hiring" | "birth" | "gender" | "tax" | "prior" | "certs"
  | "revenue" | "export" | "activities" | "direction";

interface Question {
  id: QId;
  short: string; // 확인 화면 라벨
  section: "기본 정보" | "대표자·자격" | "사업 현황";
  title: string;
  hint?: string;
  required?: boolean;
  fields: ConditionField[]; // 이 답이 쓰이는 자격 조건 항목 — "공고 N건에 쓰입니다"
  also?: string; // 자격 외 쓰임 ("법정의무 판정", "신청서 초안")
}

const QUESTIONS: Question[] = [
  { id: "name", short: "회사 이름", section: "기본 정보", title: "회사 이름을 알려주세요", hint: "선택 항목입니다. 신청서 초안에 들어갑니다.", fields: [], also: "신청서 초안" },
  { id: "type", short: "사업자 형태", section: "기본 정보", title: "사업자 형태는 무엇인가요?", required: true, fields: ["business_type"], also: "세금 신고 일정" },
  { id: "industry", short: "업종", section: "기본 정보", title: "어떤 업종인가요?", hint: "사업자등록증의 업태·종목과 가장 가까운 것을 고르세요. '카페', '쇼핑몰'처럼 검색해도 됩니다.", required: true, fields: ["industry_code"] },
  { id: "region", short: "지역", section: "기본 정보", title: "사업장은 어디에 있나요?", required: true, fields: ["region_code"] },
  { id: "founded", short: "개업일", section: "기본 정보", title: "언제 개업하셨나요?", hint: "사업자등록증의 개업연월일입니다.", required: true, fields: ["business_age_months"] },
  { id: "employees", short: "상시근로자 수", section: "기본 정보", title: "상시근로자는 몇 명인가요?", hint: "대표자를 빼고, 4대보험에 가입해 상시 근무하는 직원 수입니다.", required: true, fields: ["employee_count"], also: "노무 법정의무" },
  { id: "hiring", short: "채용 계획", section: "대표자·자격", title: "1년 안에 직원을 채용할 계획이 있나요?", fields: ["hiring_planned"], also: "채용 시 생기는 의무 안내" },
  { id: "birth", short: "대표자 생년월일", section: "대표자·자격", title: "대표자 생년월일을 알려주세요", hint: "청년(만 39세 이하) 대상 사업의 자격 판정에만 씁니다.", fields: ["ceo_age"] },
  { id: "gender", short: "대표자 성별", section: "대표자·자격", title: "대표자 성별을 알려주세요", hint: "여성기업 지원사업 판정에만 씁니다.", fields: ["ceo_gender"] },
  { id: "tax", short: "세금 체납", section: "대표자·자격", title: "국세·지방세 체납이 있나요?", hint: "대부분의 지원사업이 체납 기업을 신청 대상에서 제외합니다. 홈택스·위택스에서 확인할 수 있습니다.", fields: ["has_tax_arrears"] },
  { id: "prior", short: "이전 창업 지원", section: "대표자·자격", title: "이전에 받은 정부 창업 지원이 있나요?", hint: "같은 사업은 중복 수혜가 제한되고, 졸업기업만 신청할 수 있는 사업도 있습니다. 해당하는 것을 모두 고르세요.", fields: ["prior_support"] },
  { id: "certs", short: "보유 인증", section: "대표자·자격", title: "보유한 인증이 있나요?", hint: "해당하는 것을 모두 고르세요.", fields: ["certifications"] },
  { id: "revenue", short: "작년 연매출", section: "사업 현황", title: "작년 연매출은 얼마였나요?", hint: "억원 단위로 적어 주세요. 예: 3억 2천만 원 → 3.2", fields: ["annual_revenue_krw"] },
  { id: "export", short: "작년 수출", section: "사업 현황", title: "작년에 수출 실적이 있나요?", fields: ["export_revenue_usd_prev_year"] },
  { id: "activities", short: "사업 활동", section: "사업 현황", title: "해당하는 것을 모두 골라 주세요", hint: "각 항목마다 생기는 신고·교육 의무를 알려드립니다.", fields: ["has_online_sales", "handles_personal_data", "is_food_business", "is_vat_exempt"], also: "법정의무 판정" },
  { id: "direction", short: "사업 방향", section: "사업 현황", title: "앞으로 1~2년, 무엇을 만들어 누구에게 팔 계획인가요?", hint: "선택 항목입니다. 신청서 초안의 사업 개요에 그대로 들어갑니다.", fields: [], also: "신청서 초안" },
];

const REVIEW = QUESTIONS.length;
const INTRO = -1;

/** 미리보기 패널의 "이 항목을 답하면" → 질문 */
const INPUT_TO_QUESTION: Record<string, QId> = {
  "대표자 생년월일": "birth", "대표자 성별": "gender", 연매출: "revenue", "전년도 수출액": "export",
  "세금 체납 여부": "tax", "이전 수혜 이력": "prior", "세부 업종": "industry",
};

const ACTIVITIES = [
  { k: "has_online_sales", label: "온라인으로 판매합니다", short: "온라인 판매", desc: "통신판매업 신고" },
  { k: "handles_personal_data", label: "고객 개인정보를 처리합니다", short: "개인정보 처리", desc: "개인정보 처리방침 공개" },
  { k: "is_food_business", label: "식품을 제조·판매합니다", short: "식품 제조·판매", desc: "식품 영업신고·위생교육" },
  { k: "is_vat_exempt", label: "면세사업자입니다", short: "면세사업자", desc: "부가세 대신 사업장현황신고" },
] as const;

interface SurveyState {
  answers: Answers;
  answered: QId[];
  step: number;
}

function newProfileId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `profile-${Date.now()}`;
}

const FRESH: SurveyState = { answers: EMPTY_ANSWERS, answered: [], step: INTRO };

// ─── 답 표시 (확인 화면) ─────────────────────────────────────────────────────

function display(id: QId, a: Answers, answered: boolean): string {
  if (!answered) return "건너뜀";
  switch (id) {
    case "name": return a.name.trim() || "(비워 둠)";
    case "type": return a.business_type === "corporation" ? "법인사업자" : a.business_type === "individual" ? "개인사업자" : "-";
    case "industry": return INDUSTRY_LABEL[a.industry_code] ?? "-";
    case "region": return REGIONS.find((r) => r.code === a.region_code)?.label ?? "-";
    case "founded": return a.founded_at ? isoToDot(a.founded_at) : "-";
    case "employees": return a.employee_count === null ? "-" : `${a.employee_count}명`;
    case "hiring": return a.hiring_planned === null ? "모름" : a.hiring_planned ? "계획 있음" : "계획 없음";
    case "birth": return a.ceo_birth_date ? isoToDot(a.ceo_birth_date) : "답하지 않음";
    case "gender": return a.ceo_gender === "female" ? "여성" : a.ceo_gender === "male" ? "남성" : "답하지 않음";
    case "tax": return a.has_tax_arrears === null ? "모름" : a.has_tax_arrears ? "체납 있음" : "체납 없음";
    case "prior": return a.prior_support === null ? "모름" : a.prior_support.length ? a.prior_support.map((k) => PRIOR_SUPPORT_LABEL[k]).join(", ") : "받은 적 없음";
    case "certs": return a.certifications.length ? a.certifications.map((c) => CERT_LABEL[c]).join(", ") : "없음";
    case "revenue": return a.revenue_eok === "" ? "모름" : a.revenue_eok === "0" ? "매출 없음" : `${a.revenue_eok}억원`;
    case "export": return a.export_usd === "" ? "모름" : a.export_usd === "0" ? "수출 없음" : `${Number(a.export_usd).toLocaleString("ko-KR")}달러`;
    case "activities": {
      const on = ACTIVITIES.filter((x) => a[x.k]).map((x) => x.short);
      return on.length ? on.join(", ") : "해당 없음";
    }
    case "direction": return a.business_direction.trim() || "(비워 둠)";
  }
}

// ─── 작은 조각 ───────────────────────────────────────────────────────────────

function Choice({ on, onClick, children, sub }: { on: boolean; onClick: () => void; children: ReactNode; sub?: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={cn(selectCard({ on, block: true }), "text-left")}>
      <p className="text-sm font-semibold">{children}</p>
      {sub && <p className="text-[11px] text-[#888888] mt-0.5">{sub}</p>}
    </button>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={chip({ on })}>
      {children}
    </button>
  );
}

// ─── 화면 ────────────────────────────────────────────────────────────────────

export function SurveyScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const today = useToday();
  const { profile, isLoaded, save } = useProfile();
  const { push } = useHistory();
  const { programs: catalog } = useCatalog();

  const wantsEdit = params.get("edit") === "1";
  const isEdit = wantsEdit && profile !== null;

  // 신규 가입은 브라우저에 이어쓰기용으로 저장하고, 수정은 저장된 프로필에서 시작해 확인 화면부터 보여준다
  const [stored, setStored] = usePersistent<SurveyState>(STORAGE_KEYS.survey, FRESH);
  // 수정 모드의 시작점은 프로필에서 파생한다(프로필은 하이드레이션 뒤에 도착한다). 고친 뒤에는 editState가 이긴다
  const editBase = useMemo<SurveyState | null>(
    () => (isEdit && profile ? { answers: answersFromProfile(profile), answered: QUESTIONS.map((x) => x.id), step: REVIEW } : null),
    [isEdit, profile],
  );
  const [editState, setEditState] = useState<SurveyState | null>(null);
  const state = isEdit ? (editState ?? editBase!) : stored;
  const setState = (next: SurveyState) => (isEdit ? setEditState(next) : setStored(next));

  const { answers: a, answered, step } = state;
  const q = step >= 0 && step < REVIEW ? QUESTIONS[step] : null;
  const [returnToReview, setReturnToReview] = useState(false);
  const [industryQuery, setIndustryQuery] = useState("");
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); }, []);

  // 판정함·대시보드와 같은 기준: 마감된 공고는 세지 않는다
  const programs = useMemo(() => catalog.filter((p) => announcementStatus(p, today) !== "closed"), [catalog, today]);
  const pv = useMemo(() => preview(a, programs, today), [a, programs, today]);
  const missing = missingRequired(a);
  const maxDate = toIso(today);

  const goto = (s: number) => setState({ ...state, step: s });
  const next = (from: SurveyState = state) => {
    const target = returnToReview ? REVIEW : from.step + 1;
    if (target === REVIEW) setReturnToReview(false);
    setState({ ...from, step: target });
  };

  /** 답을 기록한다. advance면 잠깐 선택 표시를 보여준 뒤 다음 질문으로 */
  const answer = (patch: Partial<Answers>, advance = false) => {
    if (!q) return;
    const updated: SurveyState = {
      ...state,
      answers: { ...a, ...patch },
      answered: answered.includes(q.id) ? answered : [...answered, q.id],
    };
    setState(updated);
    if (advance) {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(() => next(updated), 220);
    }
  };

  // 필수 질문은 값이 있어야, 입력 오류가 있으면 넘어갈 수 없다
  const blockReason = (() => {
    if (!q) return null;
    if (q.id === "founded") return foundedError(a.founded_at, today) ?? (a.founded_at ? null : "개업일을 입력해 주세요.");
    if (q.id === "birth") return birthError(a.ceo_birth_date, today);
    if (q.id === "revenue" && a.revenue_eok !== "" && Number.isNaN(Number(a.revenue_eok))) return "숫자로 입력해 주세요.";
    if (q.required && missing.includes(REQUIRED_LABEL[q.id] ?? "")) return "답을 골라 주세요.";
    return null;
  })();
  const isAnswered = q ? answered.includes(q.id) : false;

  const finish = () => {
    const now = new Date().toISOString();
    const built = answersToProfile(a, {
      id: profile?.id ?? newProfileId(),
      created_at: isEdit && profile ? profile.created_at : now,
      biz_no: isEdit && profile ? profile.biz_no : null, // 데모: 계정이 없으니 사업자번호도 없다
    });
    if (!built) {
      toast.error("필수 항목이 비어 있습니다", { description: missing.join(", ") });
      return;
    }
    save(built);
    push({
      date: fmtDate(today),
      event: isEdit ? "프로필 수정 (설문)" : "설문으로 회원가입",
      result: `${built.name} · 답변 ${answered.length}/${QUESTIONS.length}${pv ? ` · 대상 ${pv.eligible}건` : ""}`,
    });
    if (!isEdit) setStored(FRESH);
    toast.success(isEdit ? "프로필을 저장했습니다" : `${built.name} 정보를 저장했습니다`, { description: "판정 결과로 이동합니다." });
    router.replace("/dashboard");
  };

  const applyDemo = (idx: number) => {
    const demo = loadDemoProfiles(today)[idx];
    if (!demo) return;
    save(toStoredProfile(demo));
    push({ date: fmtDate(today), event: "데모 프로필 불러오기", result: demo.name });
    setStored(FRESH);
    router.replace("/dashboard");
  };

  const progress = step <= INTRO ? 0 : Math.min(1, step / REVIEW);
  const founded = fromIso(a.founded_at);
  const ageMonths = founded && !foundedError(a.founded_at, today) ? monthsBetween(founded, today) : null;
  const industries = searchIndustries(industryQuery);

  if (wantsEdit && !isLoaded) {
    return <div className="min-h-full bg-[#F5F6F8] flex items-center justify-center p-6"><div className="w-full max-w-4xl h-[560px] bg-white border border-[#E4E6EA] rounded-3xl" /></div>;
  }

  return (
    <div className="min-h-full bg-[#F5F6F8] flex items-center justify-center p-4 md:p-6">
      <Card radius="3xl" clip className="w-full max-w-4xl grid md:grid-cols-[1fr_280px]">

        {/* ── 왼쪽: 질문 ── */}
        <div className="flex flex-col min-h-[560px]">
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-2.5">
              <Image src="/brand/logo.png" alt="비즈버디" width={176} height={56} priority className="h-9 w-auto" />
              <span className="ml-auto text-[11px] text-[#888888]">{isEdit ? "프로필 수정" : "회원 정보 설문"}</span>
            </div>
            {step !== INTRO && (
              <>
                <div className={cn(progressTrackClass, "mt-4")}>
                  <div className={progressIndicatorClass} style={{ width: `${progress * 100}%` }} />
                </div>
                <p className="text-[10px] text-[#888888] mt-2 font-mono">
                  {q ? `${q.section} · ${step + 1} / ${QUESTIONS.length}` : "확인"}
                </p>
              </>
            )}
          </div>

          <div className="px-6 pb-4 flex-1">
            {/* 시작 화면 */}
            {step === INTRO && (
              <div className="space-y-5 py-4">
                <div className="space-y-2">
                  <h1 className="text-2xl font-display font-bold text-[#111111]">3분이면 끝나는 설문입니다</h1>
                  <p className="text-sm text-[#444444] leading-relaxed">
                    질문 {QUESTIONS.length}개 중 꼭 필요한 것은 5개(사업자 형태·업종·지역·개업일·직원 수)뿐입니다.
                    나머지는 모르면 &quot;모름&quot;을 고르거나 건너뛰어도 됩니다. 모르는 항목은 자격을 &quot;제외&quot;가 아니라 &quot;확인 필요&quot;로 표시합니다.
                  </p>
                  <p className="text-[11px] text-[#888888]">답하는 동안 오른쪽에서 판정 결과가 바로 바뀝니다. 작성 중인 답은 이 브라우저에 저장되어 새로고침해도 이어서 할 수 있습니다.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {stored.answered.length > 0 && (
                    <Button onClick={() => goto(Math.min(stored.step < 0 ? 0 : stored.step, REVIEW))} variant="primary" pad="5x2.5" text="sm" radius="xl" elevate="brand" motion="colors">
                      이어서 하기 ({stored.answered.length}/{QUESTIONS.length})
                    </Button>
                  )}
                  <Button onClick={() => setStored({ ...FRESH, step: 0 })}
                    variant={stored.answered.length > 0 ? "outline" : "primary"} pad="5x2.5" text="sm" radius="xl" motion="colors"
                    elevate={stored.answered.length > 0 ? "none" : "brand"}>
                    {stored.answered.length > 0 ? "처음부터 다시" : "설문 시작"}
                  </Button>
                  {/* 시연용: 설문을 건너뛰고 데모 프로필 ①로 바로 들어간다 */}
                  <Button onClick={() => applyDemo(0)} variant="soft" pad="5x2.5" text="sm" radius="xl" motion="colors">
                    입력 건너뛰고 둘러보기 →
                  </Button>
                </div>
                <p className="text-[11px] text-[#888888]">
                  건너뛰면 데모 회사({loadDemoProfiles(today)[0]?.name})의 정보로 판정 결과를 바로 볼 수 있습니다. 마이페이지에서 언제든 내 정보로 바꿀 수 있습니다.
                </p>
                <div className="border-t border-[#E4E6EA] pt-4 space-y-2">
                  <p className="text-[11px] text-[#888888]">시연용 데모 프로필로 바로 보기</p>
                  <div className="flex flex-wrap gap-2">
                    {loadDemoProfiles(today).map((d, i) => (
                      <button key={d.id} type="button" onClick={() => applyDemo(i)} className={chip({ on: false })}>{d.demo_label}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 질문 */}
            {q && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h1 className="text-xl font-display font-bold text-[#111111]">
                    {q.title}{q.required && <span className="text-[#6E62C2]"> *</span>}
                  </h1>
                  {q.hint && <p className="text-[12px] text-[#888888] leading-relaxed">{q.hint}</p>}
                  <WhyLine q={q} n={programsUsing(q.fields, programs)} total={programs.length} />
                </div>

                {q.id === "name" && (
                  <Input variant="flowLg" autoFocus placeholder="예: 테크스타트 주식회사" value={a.name}
                    onChange={(e) => answer({ name: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) next(); }} />
                )}

                {q.id === "type" && (
                  <div className="grid grid-cols-2 gap-3">
                    <Choice on={a.business_type === "individual"} onClick={() => answer({ business_type: "individual" }, true)} sub="대표자 개인 명의로 등록">개인사업자</Choice>
                    <Choice on={a.business_type === "corporation"} onClick={() => answer({ business_type: "corporation" }, true)} sub="주식회사 등 법인 등기">법인사업자</Choice>
                  </div>
                )}

                {q.id === "industry" && (
                  <div className="space-y-2">
                    <Input variant="flowLg" autoFocus placeholder="검색 (예: 카페, 쇼핑몰, 소프트웨어, 제조)" value={industryQuery}
                      onChange={(e) => setIndustryQuery(e.target.value)} />
                    <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                      {industries.map((i) => (
                        <button key={i.code} type="button" onClick={() => answer({ industry_code: i.code }, !isBroadIndustry(i.code))}
                          aria-pressed={a.industry_code === i.code}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-sm transition-all cursor-pointer ${a.industry_code === i.code ? "bg-[#6E62C2] text-white font-semibold" : "text-[#444444] hover:bg-[#F5F6F8]"}`}>
                          <span className={`text-[10px] font-mono w-12 shrink-0 ${a.industry_code === i.code ? "text-white/70" : "text-[#888888]"}`}>{i.code}</span>
                          <span>{i.label}</span>
                        </button>
                      ))}
                      {industries.length === 0 && <p className="text-[#888888] text-xs px-3 py-4">검색 결과가 없습니다. 더 넓은 말로 찾아 보세요 (예: 음식, 제조).</p>}
                    </div>
                    {isBroadIndustry(a.industry_code) && (
                      <p className="text-[11px] text-amber-700">
                        더 세부적인 업종이 목록에 있습니다. 세부 업종을 고르면 업종 제한이 있는 공고를 &quot;확인 필요&quot; 없이 판정할 수 있습니다.
                      </p>
                    )}
                  </div>
                )}

                {q.id === "region" && (
                  <div className="flex flex-wrap gap-2">
                    {REGIONS.map((r) => (
                      <Chip key={r.code} on={a.region_code === r.code} onClick={() => answer({ region_code: r.code }, true)}>{r.short}</Chip>
                    ))}
                  </div>
                )}

                {q.id === "founded" && (
                  <div className="space-y-2">
                    <Input type="date" autoFocus max={maxDate} variant="flowLg" value={a.founded_at}
                      onChange={(e) => answer({ founded_at: e.target.value })} />
                    {ageMonths !== null && <p className="text-sm text-[#6E62C2] font-semibold">업력 약 {fmtMonths(ageMonths)}</p>}
                  </div>
                )}

                {q.id === "employees" && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {[0, 1, 2, 3, 4, 5, 7, 9].map((n) => (
                        <Chip key={n} on={a.employee_count === n} onClick={() => answer({ employee_count: n }, true)}>{n === 0 ? "없음 (대표 혼자)" : `${n}명`}</Chip>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#888888] shrink-0">직접 입력</span>
                      <Input type="number" min={0} max={999} variant="flowLg" className="max-w-32" placeholder="예: 12"
                        value={a.employee_count === null ? "" : String(a.employee_count)}
                        onChange={(e) => {
                          const n = Number.parseInt(e.target.value, 10);
                          answer({ employee_count: Number.isInteger(n) && n >= 0 && n <= 999 ? n : null });
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter" && a.employee_count !== null) next(); }} />
                      <span className="text-sm text-[#888888]">명</span>
                    </div>
                  </div>
                )}

                {q.id === "hiring" && (
                  <div className="grid grid-cols-3 gap-2">
                    <Choice on={isAnswered && a.hiring_planned === true} onClick={() => answer({ hiring_planned: true }, true)}>있음</Choice>
                    <Choice on={isAnswered && a.hiring_planned === false} onClick={() => answer({ hiring_planned: false }, true)}>없음</Choice>
                    <Choice on={isAnswered && a.hiring_planned === null} onClick={() => answer({ hiring_planned: null }, true)}>아직 모름</Choice>
                  </div>
                )}

                {q.id === "birth" && (
                  <div className="space-y-2">
                    <Input type="date" autoFocus max={maxDate} variant="flowLg" value={a.ceo_birth_date ?? ""}
                      onChange={(e) => answer({ ceo_birth_date: e.target.value || null })} />
                    <Button onClick={() => answer({ ceo_birth_date: null }, true)} variant="link" text="11" className="underline">답하지 않음</Button>
                  </div>
                )}

                {q.id === "gender" && (
                  <div className="grid grid-cols-3 gap-2">
                    <Choice on={isAnswered && a.ceo_gender === "female"} onClick={() => answer({ ceo_gender: "female" }, true)}>여성</Choice>
                    <Choice on={isAnswered && a.ceo_gender === "male"} onClick={() => answer({ ceo_gender: "male" }, true)}>남성</Choice>
                    <Choice on={isAnswered && a.ceo_gender === null} onClick={() => answer({ ceo_gender: null }, true)}>답하지 않음</Choice>
                  </div>
                )}

                {q.id === "tax" && (
                  <div className="grid grid-cols-3 gap-2">
                    <Choice on={isAnswered && a.has_tax_arrears === false} onClick={() => answer({ has_tax_arrears: false }, true)}>체납 없음</Choice>
                    <Choice on={isAnswered && a.has_tax_arrears === true} onClick={() => answer({ has_tax_arrears: true }, true)}>체납 있음</Choice>
                    <Choice on={isAnswered && a.has_tax_arrears === null} onClick={() => answer({ has_tax_arrears: null }, true)}>모름</Choice>
                  </div>
                )}

                {q.id === "prior" && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Chip on={isAnswered && a.prior_support !== null && a.prior_support.length === 0} onClick={() => answer({ prior_support: [] }, true)}>받은 적 없음</Chip>
                      <Chip on={isAnswered && a.prior_support === null} onClick={() => answer({ prior_support: null }, true)}>모름</Chip>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(PRIOR_SUPPORT_LABEL) as PriorSupport[]).map((k) => {
                        const on = a.prior_support?.includes(k) ?? false;
                        const cur = a.prior_support ?? [];
                        return <Chip key={k} on={on} onClick={() => answer({ prior_support: on ? cur.filter((x) => x !== k) : [...cur, k] })}>{PRIOR_SUPPORT_LABEL[k]}</Chip>;
                      })}
                    </div>
                  </div>
                )}

                {q.id === "certs" && (
                  <div className="flex flex-wrap gap-2">
                    <Chip on={isAnswered && a.certifications.length === 0} onClick={() => answer({ certifications: [] }, true)}>없음</Chip>
                    {(Object.keys(CERT_LABEL) as Certification[]).map((c) => {
                      const on = a.certifications.includes(c);
                      return <Chip key={c} on={on} onClick={() => answer({ certifications: on ? a.certifications.filter((x) => x !== c) : [...a.certifications, c] })}>{CERT_LABEL[c]}</Chip>;
                    })}
                  </div>
                )}

                {q.id === "revenue" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input type="number" min={0} step="0.1" autoFocus variant="flowLg" className="max-w-40" placeholder="예: 3.2"
                        value={a.revenue_eok} onChange={(e) => answer({ revenue_eok: e.target.value })}
                        onKeyDown={(e) => { if (e.key === "Enter") next(); }} />
                      <span className="text-sm text-[#888888]">억원</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Chip on={isAnswered && a.revenue_eok === "0"} onClick={() => answer({ revenue_eok: "0" }, true)}>아직 매출 없음</Chip>
                      <Chip on={isAnswered && a.revenue_eok === ""} onClick={() => answer({ revenue_eok: "" }, true)}>모름</Chip>
                    </div>
                  </div>
                )}

                {q.id === "export" && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Chip on={isAnswered && a.export_usd === "0"} onClick={() => answer({ export_usd: "0" }, true)}>수출 없음</Chip>
                      <Chip on={isAnswered && a.export_usd === ""} onClick={() => answer({ export_usd: "" }, true)}>모름</Chip>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#888888] shrink-0">수출액</span>
                      <Input type="number" min={0} variant="flowLg" className="max-w-44" placeholder="예: 100000"
                        value={a.export_usd === "0" ? "" : a.export_usd} onChange={(e) => answer({ export_usd: e.target.value })}
                        onKeyDown={(e) => { if (e.key === "Enter") next(); }} />
                      <span className="text-sm text-[#888888]">달러</span>
                    </div>
                  </div>
                )}

                {q.id === "activities" && (
                  <div className="space-y-2">
                    {ACTIVITIES.map((x) => (
                      <Choice key={x.k} on={a[x.k]} onClick={() => answer({ [x.k]: !a[x.k] } as Partial<Answers>)} sub={x.desc}>{x.label}</Choice>
                    ))}
                  </div>
                )}

                {q.id === "direction" && (
                  <Textarea variant="draftEditor" rows={5} placeholder="예: 동네 카페용 재고 관리 앱을 만들어 광주·전남 자영업자에게 월 구독으로 팔 계획입니다. 지금 가장 큰 고민은 초기 고객 확보입니다."
                    value={a.business_direction} onChange={(e) => answer({ business_direction: e.target.value })} />
                )}

                {/* 값을 넣었는데 잘못된 경우만 빨갛게 — 아직 안 고른 상태는 버튼 비활성으로 충분하다 */}
                {blockReason && ((q.id === "founded" && a.founded_at) || (q.id === "birth" && a.ceo_birth_date) || (q.id === "revenue" && a.revenue_eok)) && (
                  <p className="text-[11px] text-rose-600">{blockReason}</p>
                )}
              </div>
            )}

            {/* 확인 화면 */}
            {step === REVIEW && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h1 className="text-xl font-display font-bold text-[#111111]">{isEdit ? "수정할 항목을 고르세요" : "답변을 확인해 주세요"}</h1>
                  <p className="text-[12px] text-[#888888]">항목을 누르면 그 질문으로 돌아갑니다.</p>
                </div>
                {(["기본 정보", "대표자·자격", "사업 현황"] as const).map((sec) => (
                  <div key={sec} className="space-y-1">
                    <p className="text-[10px] font-semibold text-[#888888] uppercase tracking-wide">{sec}</p>
                    <div className="border border-[#E4E6EA] rounded-xl divide-y divide-[#E4E6EA] overflow-hidden">
                      {QUESTIONS.map((x, i) => ({ x, i })).filter(({ x }) => x.section === sec).map(({ x, i }) => {
                        const done = answered.includes(x.id);
                        const empty = x.required && missing.includes(REQUIRED_LABEL[x.id] ?? "");
                        return (
                          <button key={x.id} type="button" onClick={() => { setReturnToReview(true); goto(i); }}
                            className="w-full grid grid-cols-[1fr_1.2fr_auto] gap-3 items-center px-4 py-2.5 text-left hover:bg-[#F5F6F8] transition-colors cursor-pointer">
                            <span className="text-xs text-[#444444]">{x.short}{x.required && <span className="text-[#6E62C2]"> *</span>}</span>
                            <span className={`text-xs truncate ${empty ? "text-rose-600 font-semibold" : done ? "text-[#111111] font-medium" : "text-[#888888]"}`}>
                              {empty ? "필수 — 답해 주세요" : display(x.id, a, done)}
                            </span>
                            <span className="text-[11px] text-[#6E62C2]">수정</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 하단 버튼 */}
          <div className="px-6 py-4 border-t border-[#E4E6EA] flex items-center gap-2">
            {step > 0 && step !== INTRO ? (
              <Button onClick={() => { setReturnToReview(false); goto(step === REVIEW ? REVIEW - 1 : step - 1); }} variant="outline" pad="4x2" text="sm" radius="xl">이전</Button>
            ) : (
              <Link href="/about" className="text-[11px] text-[#888888] hover:underline">데이터 출처·면책</Link>
            )}
            <div className="ml-auto flex items-center gap-2">
              {q && (
                <Button onClick={() => next()} disabled={blockReason !== null}
                  variant={isAnswered || q.required ? "primary" : "outline"} pad="5x2" text="sm" radius="xl" motion="colors" off="o40flat"
                  elevate={isAnswered || q.required ? "brand" : "none"}>
                  {returnToReview ? "확인 화면으로" : isAnswered || q.required ? "다음" : "건너뛰기"}
                </Button>
              )}
              {step === REVIEW && (
                <Button onClick={finish} disabled={missing.length > 0} variant="primary" pad="5x2" text="sm" radius="xl" elevate="brand" motion="colors" off="o40">
                  {isEdit ? "저장하고 대시보드로" : "저장하고 판정 보기"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ── 오른쪽: 실시간 판정 미리보기 ── */}
        <aside className="border-t md:border-t-0 md:border-l border-[#E4E6EA] bg-[#FAFAFB] px-5 py-5 space-y-4">
          <p className="text-[10px] font-semibold text-[#888888] uppercase tracking-wide">지금 답으로 본 판정</p>
          {pv === null ? (
            <div className="space-y-2">
              <p className="text-xs text-[#444444] leading-relaxed">필수 5개에 답하면 공고 {programs.length}건에 대한 판정이 바로 나옵니다.</p>
              <ul className="space-y-1">
                {["사업자 형태", "업종", "지역", "개업일", "상시근로자 수"].map((l) => (
                  <li key={l} className={`text-[11px] ${missing.includes(l) ? "text-[#888888]" : "text-[#2A5A46] font-semibold"}`}>{missing.includes(l) ? "○" : "●"} {l}</li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "대상", n: pv.eligible, cls: "text-[#2A5A46]" },
                  { label: "확인 필요", n: pv.needsCheck, cls: "text-amber-700" },
                  { label: "조건 하나 부족", n: pv.conditional, cls: "text-[#6E62C2]" },
                  { label: "제외", n: pv.ineligible, cls: "text-[#888888]" },
                ].map((x) => (
                  <div key={x.label} className="bg-white border border-[#E4E6EA] rounded-xl px-3 py-2">
                    <p className="text-[10px] text-[#888888]">{x.label}</p>
                    <p className={`text-xl font-bold font-mono ${x.cls}`}>{x.n}</p>
                  </div>
                ))}
              </div>
              {pv.unlock.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-[#444444] font-semibold">이 항목에 답하면 확정됩니다</p>
                  {pv.unlock.slice(0, 4).map((u) => {
                    const target = INPUT_TO_QUESTION[u.input];
                    const idx = QUESTIONS.findIndex((x) => x.id === target);
                    return (
                      <button key={u.input} type="button" disabled={idx < 0}
                        onClick={() => { if (step === REVIEW) setReturnToReview(true); goto(idx); }}
                        className="w-full flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-left hover:bg-amber-100 transition-colors cursor-pointer">
                        <span className="text-[11px] text-amber-800">{u.input}</span>
                        <span className="text-[11px] font-mono font-semibold text-amber-800">{u.programs}건 →</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="text-[10px] text-[#888888] leading-relaxed">
                판정은 이 서비스의 규칙 코드가 합니다(AI 아님). 모르는 항목은 제외하지 않고 &quot;확인 필요&quot;로 둡니다.
              </p>
            </>
          )}
        </aside>
      </Card>
    </div>
  );
}

const REQUIRED_LABEL: Partial<Record<QId, string>> = {
  type: "사업자 형태", industry: "업종", region: "지역", founded: "개업일", employees: "상시근로자 수",
};

function WhyLine({ q, n, total }: { q: Question; n: number; total: number }) {
  if (q.fields.length === 0 && !q.also) return null;
  const parts: string[] = [];
  if (q.fields.length > 0) parts.push(n > 0 ? `공고 ${total}건 중 ${n}건의 자격 판정에 쓰입니다` : "지금 카탈로그에는 이 항목을 쓰는 공고가 없습니다");
  if (q.also) parts.push(`${q.also}에도 쓰입니다`);
  return <p className="text-[11px] text-[#6E62C2]">{parts.join(" · ")}</p>;
}
