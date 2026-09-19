"use client";

// S0 온보딩 (§8 S0) — 앱 셸 없음. 한 화면에 한 질문, 8단계.
// 디자인 토큰만 사용한다 (§4.1).
//
// 선택 카드 4곳은 selectCard()를 cn()에 통과시킨다. 겹쳐 있던 회색 테두리가 걸러져
// 선택 상태에서 보라 테두리가 이긴다(승인된 유일한 시각 변경).

import { ChevronDownIcon, InfoIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { button, chip, selectCard } from "@/components/ui/button-variants";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { progressIndicatorClass, progressTrackClass } from "@/components/ui/variants";
import { useSession } from "@/lib/auth/AuthProvider";
import { CERT_LABEL, INDUSTRIES, INDUSTRY_KEYWORDS, PRIOR_SUPPORT_LABEL, REGIONS } from "@/lib/constants";
import { loadDemoProfiles, toStoredProfile } from "@/lib/data/demoProfiles";
import { fmtDate, fromIso, monthsBetween, toIso } from "@/lib/engine/format";
import { useHistory, useProfile, useToday } from "@/lib/store/hooks";
import type { Certification, CompanyProfile, PriorSupport } from "@/lib/types";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 8;

interface Draft {
  name: string;
  biz_no: string;
  business_type: "individual" | "corporation" | null;
  industry_code: string;
  region_code: string;
  founded_at: string;
  employee_count: number;
  hiring_planned: boolean;
  ceo_birth_date: string;
  ceo_gender: "male" | "female" | null;
  revenueEok: string;
  revenueUnknown: boolean;
  exportUsd: string;
  exportUnknown: boolean;
  is_vat_exempt: boolean;
  has_online_sales: boolean;
  handles_personal_data: boolean;
  is_food_business: boolean;
  certifications: Certification[];
  has_tax_arrears: boolean | null; // null = 모름
  prior_support: PriorSupport[] | null; // null = 모름, [] = 받은 적 없음
}

const EMPTY_DRAFT: Draft = {
  name: "", biz_no: "", business_type: null, industry_code: "", region_code: "", founded_at: "",
  employee_count: 0, hiring_planned: false, ceo_birth_date: "", ceo_gender: null,
  revenueEok: "", revenueUnknown: false, exportUsd: "", exportUnknown: false, is_vat_exempt: false,
  has_online_sales: false, handles_personal_data: false, is_food_business: false, certifications: [],
  has_tax_arrears: null, prior_support: null,
};

function toDraft(p: CompanyProfile): Draft {
  return {
    name: p.name, biz_no: p.biz_no ?? "", business_type: p.business_type,
    industry_code: p.industry_code, region_code: p.region_code, founded_at: p.founded_at,
    employee_count: p.employee_count, hiring_planned: p.flags.hiring_planned,
    ceo_birth_date: p.ceo_birth_date ?? "", ceo_gender: p.ceo_gender,
    revenueEok: p.annual_revenue_krw === null ? "" : String(p.annual_revenue_krw / 100_000_000),
    revenueUnknown: p.annual_revenue_krw === null,
    exportUsd: p.export_revenue_usd_prev_year === null ? "" : String(p.export_revenue_usd_prev_year),
    exportUnknown: p.export_revenue_usd_prev_year === null,
    is_vat_exempt: p.is_vat_exempt, has_online_sales: p.flags.has_online_sales,
    handles_personal_data: p.flags.handles_personal_data, is_food_business: p.flags.is_food_business,
    certifications: p.certifications,
    has_tax_arrears: p.has_tax_arrears ?? null,
    prior_support: p.prior_support ?? null,
  };
}

function newProfileId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `profile-${Date.now()}`;
}

function toProfile(d: Draft, existing: CompanyProfile | null): CompanyProfile {
  const now = new Date().toISOString();
  const industry = INDUSTRIES.find((i) => i.code === d.industry_code);
  const region = REGIONS.find((r) => r.code === d.region_code);
  return {
    id: existing?.id ?? newProfileId(),
    name: d.name.trim() || "내 회사",
    biz_no: d.biz_no.trim() || null,
    business_type: d.business_type ?? "individual",
    industry_code: d.industry_code,
    industry_label: industry?.label ?? d.industry_code,
    region_code: d.region_code,
    region_label: region?.label ?? d.region_code,
    founded_at: d.founded_at,
    employee_count: d.employee_count,
    ceo_birth_date: d.ceo_birth_date || null,
    ceo_gender: d.ceo_gender,
    annual_revenue_krw: d.revenueUnknown || d.revenueEok === "" ? null : Math.round(Number(d.revenueEok) * 100_000_000),
    export_revenue_usd_prev_year: d.exportUnknown || d.exportUsd === "" ? null : Number(d.exportUsd),
    is_vat_exempt: d.is_vat_exempt,
    certifications: d.certifications,
    has_tax_arrears: d.has_tax_arrears,
    prior_support: d.prior_support,
    flags: {
      hiring_planned: d.hiring_planned,
      has_online_sales: d.has_online_sales,
      handles_personal_data: d.handles_personal_data,
      is_food_business: d.is_food_business,
    },
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
}

/**
 * 라벨만 봐서는 무엇을 적어야 할지 모르는 항목에만 붙이는 설명 말풍선.
 * 첫 화면이라 물음표를 뿌리면 오히려 어렵게 보인다 — 지금 붙은 자리는 세 곳뿐이다
 * (업종 코드 · 상시근로자 수 · 면세사업자). 트리거가 진짜 버튼이라 키보드로도 열린다.
 */
function HelpTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="link" box="6" radius="lg" center aria-label={`${label} 설명`}
          className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
          <InfoIcon className="size-3.5" aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{children}</TooltipContent>
    </Tooltip>
  );
}

export function OnboardingScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const today = useToday();
  const { profile, save } = useProfile();
  const { push } = useHistory();

  const isEdit = params.get("edit") === "1";
  const { status } = useSession();
  // 이 폼은 저장된 프로필을 고칠 때만 쓴다. 신규 가입은 AI 대화(/onboarding/chat)로만 받는다.
  useEffect(() => {
    if (!isEdit || status === "anon" || status === "unavailable") router.replace("/login");
  }, [isEdit, status, router]);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(() => (isEdit && profile ? toDraft(profile) : EMPTY_DRAFT));
  const [industryQuery, setIndustryQuery] = useState("");
  const [demoOpen, setDemoOpen] = useState(false);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const demoProfiles = useMemo(() => loadDemoProfiles(today), [today]);
  const maxDate = toIso(today);

  const industries = useMemo(() => {
    const q = industryQuery.trim().toLowerCase();
    if (!q) return INDUSTRIES;
    // 코드·이름 외에 일상어("카페", "쇼핑몰")로도 찾는다
    return INDUSTRIES.filter((i) =>
      i.label.toLowerCase().includes(q) || i.code.toLowerCase().includes(q) ||
      (INDUSTRY_KEYWORDS[i.code] ?? []).some((k) => k.includes(q) || q.includes(k)));
  }, [industryQuery]);

  const ageMonths = useMemo(() => {
    const d = fromIso(draft.founded_at);
    return d ? monthsBetween(d, today) : null;
  }, [draft.founded_at, today]);

  const canNext = (() => {
    switch (step) {
      case 1: return draft.business_type !== null;
      case 2: return draft.industry_code !== "";
      case 3: return draft.region_code !== "";
      case 4: return draft.founded_at !== "" && draft.founded_at <= maxDate;
      case 5: return true;
      case 6: return true;
      case 7: return draft.revenueUnknown || draft.revenueEok !== "";
      case 8: return true;
      default: return false;
    }
  })();

  const applyDemo = (id: string) => {
    const demo = demoProfiles.find((p) => p.id === id);
    if (!demo) return;
    save(toStoredProfile(demo));
    push({ date: fmtDate(today), event: "데모 프로필 불러오기", result: demo.name });
    router.replace("/dashboard");
  };

  const finish = () => {
    const next = toProfile(draft, isEdit ? profile : null);
    save(next);
    push({
      date: fmtDate(today),
      event: isEdit ? "프로필 상세 수정" : "프로필 최초 등록",
      result: isEdit ? "수정 완료, 재판정 실행" : "온보딩 완료",
    });
    router.replace("/dashboard");
  };

  return (
    <div className="min-h-full bg-[#F5F6F8] flex items-center justify-center p-6">
      <Card radius="3xl" clip className="w-full max-w-xl">

        {/* 헤더 — 여백은 cardHeader chat단과 같지만 아래 테두리가 없어 표와 어긋난다(인라인 유지). */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2.5">
            <Image src="/brand/logo.png" alt="비즈버디" width={176} height={56} priority className="h-9 w-auto" />

            {/* 손으로 만든 목록이던 자리. 이제 포커스 이동·Esc 닫기·방향키 이동·바깥 클릭이 붙는다.
                열림 상태는 그대로 demoOpen이 들고 있다(제어 모드). */}
            <div className="ml-auto">
              {/* modal 끔 — 항목을 고르면 곧바로 대시보드로 떠나므로, 스크롤 잠금·형제 aria 숨김을
                  걸었다가 화면이 사라지면서 되돌리지 못할 여지를 아예 두지 않는다.
                  Esc·방향키·바깥 클릭은 modal과 무관하게 그대로 동작한다. */}
              <DropdownMenu open={demoOpen} onOpenChange={setDemoOpen} modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="soft" pad="3x1.5" text="xs" radius="xl" motion="colors"
                    className="group/demo inline-flex items-center gap-1">
                    데모 프로필 불러오기
                    <ChevronDownIcon className="size-3.5 transition-transform group-data-open/demo:rotate-180" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  {demoProfiles.map((p) => (
                    <DropdownMenuItem key={p.id} onSelect={() => applyDemo(p.id)} className="flex-col items-start gap-0.5">
                      <span className="text-[#111111] text-xs font-semibold">{p.demo_label}</span>
                      <span className="text-[#888888] text-[10px]">{p.name} · {p.region_label} · 직원 {p.employee_count}인</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className={cn(progressTrackClass, "mt-4")}>
            <div className={progressIndicatorClass} style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
          </div>
          <p className="text-[10px] text-[#888888] mt-2 font-mono">{step} / {TOTAL_STEPS}</p>
        </div>

        {/* 본문 */}
        <div className="px-6 pb-2 min-h-[290px]">
          {step === 1 && (
            <div className="space-y-4">
              <h1 className="text-xl font-display font-bold text-[#111111]">사업자 정보를 알려주세요</h1>
              <div className="space-y-3">
                <Input variant="flowLg" placeholder="회사명 (선택)" value={draft.name} onChange={(e) => set("name", e.target.value)} />
                <Input variant="flowLg" placeholder="사업자번호 (선택 · 000-00-00000)" value={draft.biz_no}
                  onChange={(e) => set("biz_no", e.target.value)} />
                {draft.biz_no !== "" && !/^\d{3}-\d{2}-\d{5}$/.test(draft.biz_no) && (
                  <p className="text-[11px] text-amber-700">형식이 000-00-00000과 다릅니다. 표시용으로만 저장됩니다.</p>
                )}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {([{ v: "individual", label: "개인사업자" }, { v: "corporation", label: "법인사업자" }] as const).map((o) => (
                    <button key={o.v} onClick={() => set("business_type", o.v)}
                      className={cn(selectCard({ on: draft.business_type === o.v }))}>
                      <p className="text-sm font-semibold">{o.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-display font-bold text-[#111111]">어떤 업종인가요?</h1>
                <HelpTip label="업종 코드">
                  목록 왼쪽의 알파벳+숫자는 통계청 한국표준산업분류(KSIC) 코드입니다. 사업자등록증의 업태·종목과 가장 가까운 항목을 고르세요.
                </HelpTip>
              </div>
              <Input variant="flowLg" placeholder="업종 검색 (예: 카페, 쇼핑몰, 소프트웨어, 제조)" value={industryQuery}
                onChange={(e) => setIndustryQuery(e.target.value)} />
              {/* 업종 행은 ON에만 굵기가 붙는 1회용 모양이라 표로 옮기지 않는다(button-variants.ts 하단). */}
              <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                {industries.map((i) => (
                  <button key={i.code} onClick={() => set("industry_code", i.code)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-sm transition-all cursor-pointer ${draft.industry_code === i.code ? "bg-[#6E62C2] text-white font-semibold" : "text-[#444444] hover:bg-[#F5F6F8]"}`}>
                    <span className={`text-[10px] font-mono ${draft.industry_code === i.code ? "text-white/70" : "text-[#888888]"}`}>{i.code}</span>
                    <span>{i.label}</span>
                  </button>
                ))}
                {industries.length === 0 && <p className="text-[#888888] text-xs px-3 py-4">검색 결과가 없습니다.</p>}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h1 className="text-xl font-display font-bold text-[#111111]">사업장이 어디에 있나요?</h1>
              <div className="flex flex-wrap gap-2">
                {REGIONS.map((r) => (
                  <button key={r.code} onClick={() => set("region_code", r.code)}
                    className={chip({ on: draft.region_code === r.code, elevate: "sm" })}>
                    {r.short}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h1 className="text-xl font-display font-bold text-[#111111]">언제 개업하셨나요?</h1>
              <Input type="date" max={maxDate} variant="flowLg" value={draft.founded_at}
                onChange={(e) => set("founded_at", e.target.value)} />
              {ageMonths !== null && (
                <p className="text-sm text-[#6E62C2] font-semibold">
                  업력 약 {Math.floor(ageMonths / 12)}년 {ageMonths % 12}개월
                </p>
              )}
              <p className="text-[11px] text-[#888888]">업력은 지원사업 자격과 소멸 시점 계산의 기준이 됩니다.</p>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-display font-bold text-[#111111]">상시근로자가 몇 명인가요?</h1>
                <HelpTip label="상시근로자 수">
                  4대보험에 가입해 상시 근무하는 직원이 기준입니다. 지원사업·법령마다 산정 방식이 조금씩 다르니, 신청 전에 소관기관 공고문을 한 번 확인하세요.
                </HelpTip>
              </div>
              <p className="text-[11px] text-[#888888]">대표자는 제외하고 세어주세요.</p>
              <div className="flex items-center gap-3">
                {/* box만 있고 center가 없다 — UA 기본 가운데 정렬에 기댄다. */}
                <Button onClick={() => set("employee_count", Math.max(0, draft.employee_count - 1))}
                  variant="iconNeutral" box="10" radius="xl">−</Button>
                <span className="text-3xl font-display font-bold text-[#111111] w-16 text-center font-mono">{draft.employee_count}</span>
                <Button onClick={() => set("employee_count", Math.min(999, draft.employee_count + 1))}
                  variant="iconNeutral" box="10" radius="xl">+</Button>
                <span className="text-[#888888] text-sm">인</span>
              </div>
              <button onClick={() => set("hiring_planned", !draft.hiring_planned)}
                className={cn(selectCard({ on: draft.hiring_planned, block: true }))}>
                <p className="text-sm font-semibold">채용 예정 {draft.hiring_planned ? "✓" : ""}</p>
                <p className="text-[11px] text-[#888888] mt-0.5">채용 시 생기는 의무와 자격 변화를 미리 알려드립니다.</p>
              </button>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <h1 className="text-xl font-display font-bold text-[#111111]">대표자 정보 (선택)</h1>
              <div className="space-y-2">
                <p className="text-[11px] text-[#888888]">생년월일</p>
                <Input type="date" max={maxDate} variant="flowLg" value={draft.ceo_birth_date}
                  onChange={(e) => set("ceo_birth_date", e.target.value)} />
                <Button onClick={() => set("ceo_birth_date", "")}
                  variant="link" text="11" className="underline">답하지 않음</Button>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] text-[#888888]">성별</p>
                <div className="flex gap-2">
                  {([{ v: "male", label: "남성" }, { v: "female", label: "여성" }, { v: null, label: "답하지 않음" }] as const).map((o) => (
                    <button key={o.label} onClick={() => set("ceo_gender", o.v)}
                      className={chip({ on: draft.ceo_gender === o.v })}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-[#888888]">미입력 항목은 관련 요건이 &quot;확인 필요&quot;로 표시됩니다.</p>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-4">
              <h1 className="text-xl font-display font-bold text-[#111111]">매출과 수출 실적</h1>
              <div className="space-y-2">
                <p className="text-[11px] text-[#888888]">연매출 (억원)</p>
                <div className="flex gap-2">
                  <Input type="number" min={0} step="0.1" variant="flowLg" placeholder="예: 3.2" value={draft.revenueEok}
                    disabled={draft.revenueUnknown}
                    onChange={(e) => set("revenueEok", e.target.value)} />
                  {/* 이 칩 두 개만 OFF hover 테두리가 없다. */}
                  <button onClick={() => setDraft((d) => ({ ...d, revenueUnknown: !d.revenueUnknown, revenueEok: "" }))}
                    className={cn(chip({ on: draft.revenueUnknown, hoverBorder: false }), "shrink-0")}>
                    모름
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] text-[#888888]">전년도 수출액 (달러, 선택)</p>
                <div className="flex gap-2">
                  <Input type="number" min={0} variant="flowLg" placeholder="예: 100000" value={draft.exportUsd}
                    disabled={draft.exportUnknown}
                    onChange={(e) => set("exportUsd", e.target.value)} />
                  <button onClick={() => setDraft((d) => ({ ...d, exportUnknown: !d.exportUnknown, exportUsd: "" }))}
                    className={cn(chip({ on: draft.exportUnknown, hoverBorder: false }), "shrink-0")}>
                    모름
                  </button>
                </div>
              </div>
              {/* 위 두 묶음과 같은 형태(11px 회색 라벨 + 컨트롤)로 맞췄다 — 카드 안에는
                  말풍선 트리거를 넣을 수 없어서(버튼 안 버튼) 라벨 줄에 붙인다. */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <p className="text-[11px] text-[#888888]">부가세 유형</p>
                  <HelpTip label="면세사업자">
                    부가가치세를 매기지 않는 업종만 하는 사업자입니다. 사업자등록증에 &quot;면세사업자&quot;로 적혀 있고, 세금계산서 대신 계산서를 발행합니다.
                  </HelpTip>
                </div>
                <button onClick={() => set("is_vat_exempt", !draft.is_vat_exempt)}
                  className={cn(selectCard({ on: draft.is_vat_exempt, block: true }))}>
                  <p className="text-sm font-semibold">면세사업자입니다 {draft.is_vat_exempt ? "✓" : ""}</p>
                </button>
              </div>
            </div>
          )}

          {step === 8 && (
            <div className="space-y-4">
              <h1 className="text-xl font-display font-bold text-[#111111]">해당하는 항목을 골라주세요</h1>
              <div className="space-y-2">
                {([
                  { k: "has_online_sales", label: "온라인으로 판매합니다", desc: "통신판매업 신고 의무가 생깁니다" },
                  { k: "handles_personal_data", label: "고객 개인정보를 처리합니다", desc: "개인정보 처리방침 공개 의무가 생깁니다" },
                  { k: "is_food_business", label: "식품을 다룹니다", desc: "식품 영업신고·위생교육 의무가 생깁니다" },
                ] as const).map((o) => (
                  <button key={o.k} onClick={() => set(o.k, !draft[o.k])}
                    className={cn(selectCard({ on: draft[o.k], block: true }))}>
                    <p className="text-sm font-semibold">{o.label} {draft[o.k] ? "✓" : ""}</p>
                    <p className="text-[11px] text-[#888888] mt-0.5">{o.desc}</p>
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-[11px] text-[#888888]">국세·지방세 체납 <span className="text-[#6E62C2]">— 대부분의 지원사업이 체납 기업을 제외합니다</span></p>
                <div className="flex gap-2">
                  {([{ v: false, label: "체납 없음" }, { v: true, label: "체납 있음" }, { v: null, label: "모름" }] as const).map((o) => (
                    <button key={o.label} onClick={() => set("has_tax_arrears", o.v)} className={chip({ on: draft.has_tax_arrears === o.v })}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] text-[#888888]">이전에 받은 창업 지원 <span className="text-[#6E62C2]">— 같은 사업은 중복 수혜가 제한됩니다</span></p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => set("prior_support", [])} className={chip({ on: draft.prior_support !== null && draft.prior_support.length === 0 })}>
                    받은 적 없음
                  </button>
                  {(Object.keys(PRIOR_SUPPORT_LABEL) as PriorSupport[]).map((k) => {
                    const on = draft.prior_support?.includes(k) ?? false;
                    const cur = draft.prior_support ?? [];
                    return (
                      <button key={k} onClick={() => set("prior_support", on ? cur.filter((x) => x !== k) : [...cur, k])} className={chip({ on })}>
                        {PRIOR_SUPPORT_LABEL[k]}
                      </button>
                    );
                  })}
                  <button onClick={() => set("prior_support", null)} className={chip({ on: draft.prior_support === null })}>
                    모름
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] text-[#888888]">보유 인증</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(CERT_LABEL) as Certification[]).map((c) => {
                    const on = draft.certifications.includes(c);
                    return (
                      <button key={c} onClick={() => set("certifications", on ? draft.certifications.filter((x) => x !== c) : [...draft.certifications, c])}
                        className={chip({ on })}>
                        {CERT_LABEL[c]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="px-6 py-4 border-t border-[#E4E6EA] flex items-center gap-2">
          {step > 1 ? (
            <Button onClick={() => setStep((s) => s - 1)}
              variant="outline" pad="4x2" text="sm" radius="xl">
              이전
            </Button>
          ) : (
            <Link href="/about" className={cn(button({ variant: "link", text: "11", hand: false }), "hover:underline")}>데이터 출처·면책</Link>
          )}
          <div className="ml-auto">
            {step < TOTAL_STEPS ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}
                variant="primary" pad="5x2" text="sm" radius="xl" elevate="brand" motion="colors" off="o40flat">
                다음
              </Button>
            ) : (
              <Button onClick={finish} disabled={!canNext}
                variant="primary" pad="5x2" text="sm" radius="xl" elevate="brand" motion="colors" off="o40">
                {isEdit ? "저장하고 대시보드로" : "판정 시작하기"}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
