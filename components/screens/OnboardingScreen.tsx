"use client";

// S0 온보딩 (§8 S0) — 앱 셸 없음. 한 화면에 한 질문, 8단계.
// 디자인 토큰만 사용한다 (§4.1).

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useSession } from "@/lib/auth/AuthProvider";
import { CERT_LABEL, INDUSTRIES, REGIONS } from "@/lib/constants";
import { loadDemoProfiles, toStoredProfile } from "@/lib/data/demoProfiles";
import { fmtDate, fromIso, monthsBetween, toIso } from "@/lib/engine/format";
import { useHistory, useProfile, useToday } from "@/lib/store/hooks";
import type { Certification, CompanyProfile } from "@/lib/types";

const TOTAL_STEPS = 8;

const CARD = "border border-[#E4E6EA] rounded-2xl px-4 py-3 text-left transition-all cursor-pointer hover:border-[#6E62C2]/40";
const CARD_ON = "border-[#6E62C2] bg-[#f0eef9] text-[#111111]";
const INPUT = "w-full border border-[#E4E6EA] rounded-xl px-4 py-2.5 text-sm text-[#111111] placeholder-[#888888] focus:outline-none focus:border-[#6E62C2] focus:ring-2 focus:ring-[#6E62C2]/10";
const CHIP = "px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer";

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
}

const EMPTY_DRAFT: Draft = {
  name: "", biz_no: "", business_type: null, industry_code: "", region_code: "", founded_at: "",
  employee_count: 0, hiring_planned: false, ceo_birth_date: "", ceo_gender: null,
  revenueEok: "", revenueUnknown: false, exportUsd: "", exportUnknown: false, is_vat_exempt: false,
  has_online_sales: false, handles_personal_data: false, is_food_business: false, certifications: [],
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
    return INDUSTRIES.filter((i) => i.label.toLowerCase().includes(q) || i.code.toLowerCase().includes(q));
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
      <div className="w-full max-w-xl bg-white border border-[#E4E6EA] rounded-3xl shadow-sm overflow-hidden">

        {/* 헤더 */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2.5">
            <Image src="/brand/logo.png" alt="비즈버디" width={176} height={56} priority className="h-9 w-auto" />

            <div className="ml-auto relative">
              <button onClick={() => setDemoOpen((v) => !v)}
                className="text-xs font-semibold text-[#6E62C2] bg-[#f0eef9] border border-[#dddaf4] px-3 py-1.5 rounded-xl hover:bg-[#dddaf4] transition-colors cursor-pointer">
                데모 프로필 불러오기 ▾
              </button>
              {demoOpen && (
                <div className="absolute right-0 mt-1 w-72 bg-white border border-[#E4E6EA] rounded-2xl shadow-lg z-10 overflow-hidden">
                  {demoProfiles.map((p) => (
                    <button key={p.id} onClick={() => applyDemo(p.id)}
                      className="w-full text-left px-4 py-3 hover:bg-[#F5F6F8] transition-colors cursor-pointer border-b border-[#F5F6F8] last:border-0">
                      <p className="text-[#111111] text-xs font-semibold">{p.demo_label}</p>
                      <p className="text-[#888888] text-[10px] mt-0.5">{p.name} · {p.region_label} · 직원 {p.employee_count}인</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 h-1 bg-[#E4E6EA] rounded-full overflow-hidden">
            <div className="h-full bg-[#6E62C2] transition-all" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
          </div>
          <p className="text-[10px] text-[#888888] mt-2 font-mono">{step} / {TOTAL_STEPS}</p>
        </div>

        {/* 본문 */}
        <div className="px-6 pb-2 min-h-[290px]">
          {step === 1 && (
            <div className="space-y-4">
              <h1 className="text-xl font-display font-bold text-[#111111]">사업자 정보를 알려주세요</h1>
              <div className="space-y-3">
                <input className={INPUT} placeholder="회사명 (선택)" value={draft.name} onChange={(e) => set("name", e.target.value)} />
                <input className={INPUT} placeholder="사업자번호 (선택 · 000-00-00000)" value={draft.biz_no}
                  onChange={(e) => set("biz_no", e.target.value)} />
                {draft.biz_no !== "" && !/^\d{3}-\d{2}-\d{5}$/.test(draft.biz_no) && (
                  <p className="text-[11px] text-amber-700">형식이 000-00-00000과 다릅니다. 표시용으로만 저장됩니다.</p>
                )}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {([{ v: "individual", label: "개인사업자" }, { v: "corporation", label: "법인사업자" }] as const).map((o) => (
                    <button key={o.v} onClick={() => set("business_type", o.v)}
                      className={`${CARD} ${draft.business_type === o.v ? CARD_ON : "text-[#444444]"}`}>
                      <p className="text-sm font-semibold">{o.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h1 className="text-xl font-display font-bold text-[#111111]">어떤 업종인가요?</h1>
              <input className={INPUT} placeholder="업종 검색 (예: 소프트웨어, 제조)" value={industryQuery}
                onChange={(e) => setIndustryQuery(e.target.value)} />
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
                    className={`${CHIP} ${draft.region_code === r.code ? "bg-[#6E62C2] text-white border-[#6E62C2] shadow-sm" : "bg-white border-[#E4E6EA] text-[#444444] hover:border-[#6E62C2]/40"}`}>
                    {r.short}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h1 className="text-xl font-display font-bold text-[#111111]">언제 개업하셨나요?</h1>
              <input type="date" max={maxDate} className={INPUT} value={draft.founded_at}
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
              <h1 className="text-xl font-display font-bold text-[#111111]">상시근로자가 몇 명인가요?</h1>
              <p className="text-[11px] text-[#888888]">대표자는 제외하고 세어주세요.</p>
              <div className="flex items-center gap-3">
                <button onClick={() => set("employee_count", Math.max(0, draft.employee_count - 1))}
                  className="w-10 h-10 rounded-xl border border-[#E4E6EA] text-[#444444] hover:bg-[#F5F6F8] cursor-pointer">−</button>
                <span className="text-3xl font-display font-bold text-[#111111] w-16 text-center font-mono">{draft.employee_count}</span>
                <button onClick={() => set("employee_count", Math.min(999, draft.employee_count + 1))}
                  className="w-10 h-10 rounded-xl border border-[#E4E6EA] text-[#444444] hover:bg-[#F5F6F8] cursor-pointer">+</button>
                <span className="text-[#888888] text-sm">인</span>
              </div>
              <button onClick={() => set("hiring_planned", !draft.hiring_planned)}
                className={`${CARD} w-full ${draft.hiring_planned ? CARD_ON : "text-[#444444]"}`}>
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
                <input type="date" max={maxDate} className={INPUT} value={draft.ceo_birth_date}
                  onChange={(e) => set("ceo_birth_date", e.target.value)} />
                <button onClick={() => set("ceo_birth_date", "")}
                  className="text-[11px] text-[#888888] hover:text-[#6E62C2] cursor-pointer underline">답하지 않음</button>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] text-[#888888]">성별</p>
                <div className="flex gap-2">
                  {([{ v: "male", label: "남성" }, { v: "female", label: "여성" }, { v: null, label: "답하지 않음" }] as const).map((o) => (
                    <button key={o.label} onClick={() => set("ceo_gender", o.v)}
                      className={`${CHIP} ${draft.ceo_gender === o.v ? "bg-[#6E62C2] text-white border-[#6E62C2]" : "bg-white border-[#E4E6EA] text-[#444444] hover:border-[#6E62C2]/40"}`}>
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
                  <input type="number" min={0} step="0.1" className={INPUT} placeholder="예: 3.2" value={draft.revenueEok}
                    disabled={draft.revenueUnknown}
                    onChange={(e) => set("revenueEok", e.target.value)} />
                  <button onClick={() => setDraft((d) => ({ ...d, revenueUnknown: !d.revenueUnknown, revenueEok: "" }))}
                    className={`${CHIP} shrink-0 ${draft.revenueUnknown ? "bg-[#6E62C2] text-white border-[#6E62C2]" : "bg-white border-[#E4E6EA] text-[#444444]"}`}>
                    모름
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] text-[#888888]">전년도 수출액 (달러, 선택)</p>
                <div className="flex gap-2">
                  <input type="number" min={0} className={INPUT} placeholder="예: 100000" value={draft.exportUsd}
                    disabled={draft.exportUnknown}
                    onChange={(e) => set("exportUsd", e.target.value)} />
                  <button onClick={() => setDraft((d) => ({ ...d, exportUnknown: !d.exportUnknown, exportUsd: "" }))}
                    className={`${CHIP} shrink-0 ${draft.exportUnknown ? "bg-[#6E62C2] text-white border-[#6E62C2]" : "bg-white border-[#E4E6EA] text-[#444444]"}`}>
                    모름
                  </button>
                </div>
              </div>
              <button onClick={() => set("is_vat_exempt", !draft.is_vat_exempt)}
                className={`${CARD} w-full ${draft.is_vat_exempt ? CARD_ON : "text-[#444444]"}`}>
                <p className="text-sm font-semibold">면세사업자입니다 {draft.is_vat_exempt ? "✓" : ""}</p>
              </button>
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
                    className={`${CARD} w-full ${draft[o.k] ? CARD_ON : "text-[#444444]"}`}>
                    <p className="text-sm font-semibold">{o.label} {draft[o.k] ? "✓" : ""}</p>
                    <p className="text-[11px] text-[#888888] mt-0.5">{o.desc}</p>
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-[11px] text-[#888888]">보유 인증</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(CERT_LABEL) as Certification[]).map((c) => {
                    const on = draft.certifications.includes(c);
                    return (
                      <button key={c} onClick={() => set("certifications", on ? draft.certifications.filter((x) => x !== c) : [...draft.certifications, c])}
                        className={`${CHIP} ${on ? "bg-[#6E62C2] text-white border-[#6E62C2]" : "bg-white border-[#E4E6EA] text-[#444444] hover:border-[#6E62C2]/40"}`}>
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
            <button onClick={() => setStep((s) => s - 1)}
              className="px-4 py-2 rounded-xl border border-[#E4E6EA] text-[#444444] text-sm font-semibold hover:bg-[#F5F6F8] cursor-pointer">
              이전
            </button>
          ) : (
            <Link href="/about" className="text-[11px] text-[#888888] hover:text-[#6E62C2] hover:underline">데이터 출처·면책</Link>
          )}
          <div className="ml-auto">
            {step < TOTAL_STEPS ? (
              <button onClick={() => setStep((s) => s + 1)} disabled={!canNext}
                className="px-5 py-2 rounded-xl bg-[#6E62C2] text-white text-sm font-semibold hover:bg-[#5a50a8] transition-colors cursor-pointer shadow-md shadow-[#6E62C2]/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none">
                다음
              </button>
            ) : (
              <button onClick={finish} disabled={!canNext}
                className="px-5 py-2 rounded-xl bg-[#6E62C2] text-white text-sm font-semibold hover:bg-[#5a50a8] transition-colors cursor-pointer shadow-md shadow-[#6E62C2]/25 disabled:opacity-40 disabled:cursor-not-allowed">
                {isEdit ? "저장하고 대시보드로" : "판정 시작하기"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
