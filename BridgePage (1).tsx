"use client";

import { useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Page = "dashboard" | "announcements" | "grants" | "tasks" | "calendar" | "expiring" | "simulator" | "mypage";
type GrantStatus = "pass" | "fail" | "conditional";

interface EligibilityCriteria {
  label: string;
  required: string;
  current: string;
  pass: boolean;
}

interface Grant {
  id: number;
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
}

interface Task {
  id: number;
  title: string;
  type: "date" | "event";
  dueDate: string;
  authority: string;
  penalty: string;
  done: boolean;
}

interface ExpiringItem {
  id: number;
  grantName: string;
  expiresIn: number;
  reason: string;
  axis: "업력" | "대표자연령" | "직원수";
}

// ─── Data ────────────────────────────────────────────────────────────────────

const DEFAULT_COMPANY = {
  name: "테크스타트 주식회사",
  bizNo: "234-86-01827",
  sector: "소프트웨어 개발업",
  region: "서울특별시",
  employees: 4,
  foundedDate: "2023.06.15",
  ceoAge: 37,
  yearsOld: 1,
};

type Company = typeof DEFAULT_COMPANY;

const grants: Grant[] = [
  {
    id: 1, name: "창업도약패키지", agency: "창업진흥원", amount: "최대 3억원", deadline: "2026.09.30", status: "pass",
    supportType: "사업화 자금 + 멘토링",
    description: "창업 3~7년차 스타트업을 대상으로 성장 단계별 맞춤형 자금과 전문 멘토링을 지원하는 창업진흥원 핵심 사업입니다.",
    eligibility: [
      { label: "업력", required: "3년 이상 7년 이하", current: "약 3년 (2023.06 창업)", pass: true },
      { label: "업종", required: "제조·IT·서비스 등 전 업종", current: "소프트웨어 개발업", pass: true },
      { label: "지역", required: "전국", current: "서울특별시", pass: true },
      { label: "직원 수", required: "제한 없음", current: "4인", pass: true },
      { label: "대표자 연령", required: "제한 없음", current: "37세", pass: true },
    ],
  },
  {
    id: 2, name: "초기창업패키지", agency: "창업진흥원", amount: "최대 1억원", deadline: "2026.09.15", status: "pass",
    supportType: "창업 초기 사업화 자금",
    description: "창업 3년 이내 예비·초기 창업자의 사업 아이템 검증과 시제품 제작, 초기 판로 개척을 지원하는 사업입니다.",
    eligibility: [
      { label: "업력", required: "3년 이내", current: "약 3년 (2023.06 창업)", pass: true },
      { label: "업종", required: "제조·IT·바이오 등 전 업종", current: "소프트웨어 개발업", pass: true },
      { label: "지역", required: "전국", current: "서울특별시", pass: true },
      { label: "직원 수", required: "10인 미만", current: "4인", pass: true },
      { label: "대표자 연령", required: "제한 없음", current: "37세", pass: true },
    ],
  },
  {
    id: 3, name: "청년창업사관학교", agency: "중소벤처기업부", amount: "최대 1억원", deadline: "2026.10.10", status: "pass",
    supportType: "교육 + 사업화 자금 + 입주",
    description: "만 39세 이하 청년 창업자를 선발해 입교부터 졸업까지 사업화 과정을 체계적으로 지원하는 중소벤처기업부의 대표 청년 창업 지원 프로그램입니다.",
    eligibility: [
      { label: "대표자 연령", required: "만 39세 이하", current: "37세", pass: true },
      { label: "업력", required: "3년 이내", current: "약 3년 (2023.06 창업)", pass: true },
      { label: "업종", required: "제조·IT·서비스 등", current: "소프트웨어 개발업", pass: true },
      { label: "지역", required: "전국 (입주 지역 선택)", current: "서울특별시", pass: true },
      { label: "직원 수", required: "10인 미만", current: "4인", pass: true },
    ],
  },
  { id: 4, name: "혁신창업스쿨", agency: "중소기업진흥공단", amount: "최대 5,000만원", deadline: "2026.09.20", status: "conditional", nearMissReason: "상시근로자 5인 이상 조건 — 현재 4인. 1명 충원 시 자격 충족" },
  { id: 5, name: "TIPS 프로그램", agency: "중소벤처기업부", amount: "최대 5억원", deadline: "2026.10.31", status: "conditional", nearMissReason: "기술보증기금 추천 기관 확인 필요 — 기술평가 신청으로 해결 가능" },
  { id: 6, name: "여성기업 지원사업", agency: "여성기업종합지원센터", amount: "최대 2,000만원", deadline: "2026.09.05", status: "fail", failReason: "대표자 성별 조건 미충족 (여성 대표자 기업 한정)" },
  { id: 7, name: "소상공인 경영개선자금", agency: "소상공인시장진흥공단", amount: "최대 7,000만원", deadline: "2026.09.25", status: "fail", failReason: "업종 조건 미충족 (제조·음식·소매업 한정, 소프트웨어 업종 제외)" },
  { id: 8, name: "수출바우처", agency: "KOTRA", amount: "최대 5,000만원", deadline: "상시", status: "fail", failReason: "수출 실적 조건 미충족 (전년도 수출액 10만 달러 이상 필요)" },
];

const tasks: Task[] = [
  { id: 1, title: "원천세 신고·납부", type: "date", dueDate: "2026.09.10", authority: "국세청", penalty: "미신고 시 가산세 20%", done: false },
  { id: 2, title: "4대보험 월별 보험료 납부", type: "date", dueDate: "2026.09.10", authority: "국민건강보험공단", penalty: "연체 이자 발생", done: true },
  { id: 3, title: "부가가치세 예정신고", type: "date", dueDate: "2026.10.25", authority: "국세청", penalty: "미신고 시 가산세 20%", done: false },
  { id: 4, title: "근로계약서 교부 (신규 채용 시)", type: "event", dueDate: "채용 즉시", authority: "고용노동부", penalty: "미교부 시 과태료 500만원", done: false },
  { id: 5, title: "4대보험 신규 취득 신고", type: "event", dueDate: "채용 후 14일 이내", authority: "국민건강보험공단", penalty: "미신고 시 과태료 10만원/1인당", done: false },
  { id: 6, title: "임금명세서 교부", type: "event", dueDate: "임금 지급 시마다", authority: "고용노동부", penalty: "미교부 시 과태료 500만원", done: false },
];

type AnnouncementStatus = "open" | "closing" | "closed";
type AnnouncementField = "전체" | "창업" | "R&D" | "수출" | "고용" | "금융";

interface Announcement {
  id: number;
  title: string;
  agency: string;
  field: AnnouncementField;
  amount: string;
  startDate: string;
  endDate: string;
  status: AnnouncementStatus;
  eligible: boolean;
}

const allAnnouncements: Announcement[] = [
  { id: 1,  title: "2026년 초기창업패키지 모집",          agency: "창업진흥원",          field: "창업",  amount: "최대 1억원",    startDate: "2026.08.01", endDate: "2026.09.15", status: "open",    eligible: true },
  { id: 2,  title: "창업도약패키지 3차 모집",              agency: "창업진흥원",          field: "창업",  amount: "최대 3억원",    startDate: "2026.08.10", endDate: "2026.09.30", status: "open",    eligible: true },
  { id: 3,  title: "청년창업사관학교 14기 모집",           agency: "중소벤처기업부",      field: "창업",  amount: "최대 1억원",    startDate: "2026.09.01", endDate: "2026.10.10", status: "open",    eligible: true },
  { id: 4,  title: "혁신창업스쿨 하반기 모집",             agency: "중소기업진흥공단",    field: "창업",  amount: "최대 5,000만원", startDate: "2026.08.20", endDate: "2026.09.20", status: "closing", eligible: false },
  { id: 5,  title: "TIPS 프로그램 4분기 접수",             agency: "중소벤처기업부",      field: "R&D",   amount: "최대 5억원",    startDate: "2026.09.01", endDate: "2026.10.31", status: "open",    eligible: false },
  { id: 6,  title: "중소기업 기술개발 R&D 지원",           agency: "중소기업기술정보진흥원", field: "R&D", amount: "최대 2억원",    startDate: "2026.07.15", endDate: "2026.09.10", status: "closing", eligible: true },
  { id: 7,  title: "수출바우처 4분기 신청",                agency: "KOTRA",              field: "수출",  amount: "최대 5,000만원", startDate: "2026.09.01", endDate: "상시",       status: "open",    eligible: false },
  { id: 8,  title: "청년일자리도약장려금 신청",            agency: "고용노동부",          field: "고용",  amount: "월 60만원×1년", startDate: "2026.01.01", endDate: "2026.12.31", status: "open",    eligible: true },
  { id: 9,  title: "소상공인 경영개선자금 2차",            agency: "소상공인시장진흥공단", field: "금융", amount: "최대 7,000만원", startDate: "2026.08.01", endDate: "2026.09.25", status: "closing", eligible: false },
  { id: 10, title: "기술보증기금 스타트업 보증 지원",      agency: "기술보증기금",        field: "금융",  amount: "최대 30억원",   startDate: "2026.09.01", endDate: "상시",       status: "open",    eligible: true },
  { id: 11, title: "글로벌 액셀러레이팅 프로그램",         agency: "창업진흥원",          field: "수출",  amount: "최대 5,000만원", startDate: "2026.06.01", endDate: "2026.08.31", status: "closed",  eligible: false },
  { id: 12, title: "중소기업 고용창출장려금",              agency: "고용노동부",          field: "고용",  amount: "최대 720만원",  startDate: "2026.01.01", endDate: "2026.12.31", status: "open",    eligible: true },
];

const expiringItems: ExpiringItem[] = [
  { id: 1, grantName: "초기창업패키지", expiresIn: 55, reason: "업력 3년 이하 조건 — 2026.11.09 이후 자격 소멸", axis: "업력" },
  { id: 2, grantName: "청년창업사관학교", expiresIn: 82, reason: "대표자 만 39세 이하 조건 — 2027.01.05 이후 자격 소멸", axis: "대표자연령" },
  { id: 3, grantName: "창업도약패키지", expiresIn: 113, reason: "업력 7년 이하 조건 — 2030.06.14 만료 (여유 있음)", axis: "업력" },
];

// ─── Unsplash image URLs ──────────────────────────────────────────────────────
// lifestyle: natural light, real people
// 3d-cutout: object-only, transparent-bg style shots
const PHOTOS = {
  heroLifestyle:   "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&q=85&fit=crop",
  officeWarm:      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&q=85&fit=crop",
  laptopSunlight:  "https://images.unsplash.com/photo-1551434678-e076c223a692?w=900&q=85&fit=crop",
  teamMeeting:     "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&q=85&fit=crop",
  deskDocuments:   "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=900&q=85&fit=crop",
  personCutout:    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=85&fit=crop&crop=faces",
  plantDesk:       "https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600&q=85&fit=crop",
  coffeeWork:      "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=85&fit=crop",
};

// ─── Icon Components ─────────────────────────────────────────────────────────

const GridIcon        = () => <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg>;
const CheckCircleIcon = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><circle cx="8" cy="8" r="6.5"/><path d="M5 8.5l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const ListIcon        = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M2 4h12M2 8h12M2 12h8" strokeLinecap="round"/></svg>;
const ClockIcon       = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><circle cx="8" cy="8" r="6.5"/><path d="M8 5v3.5l2 2" strokeLinecap="round"/></svg>;
const UsersIcon       = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><circle cx="6" cy="5" r="2.5"/><path d="M1 13c0-2.76 2.24-5 5-5s5 2.24 5 5" strokeLinecap="round"/><path d="M12 7a2 2 0 100-4M15 13c0-2-.9-3.7-2.2-4.7" strokeLinecap="round"/></svg>;
const PersonIcon      = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><circle cx="8" cy="5" r="3"/><path d="M2 14c0-3.31 2.69-6 6-6s6 2.69 6 6" strokeLinecap="round"/></svg>;
const MegaphoneIcon = (): React.ReactElement => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M2 6h2v4H2z" strokeLinejoin="round"/><path d="M4 6.5L12 2v12L4 9.5" strokeLinejoin="round"/><path d="M4 10l1 4" strokeLinecap="round"/></svg>;
const CalendarIcon  = (): React.ReactElement => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><rect x="1.5" y="2.5" width="13" height="12" rx="2"/><path d="M1.5 6.5h13M5 1v3M11 1v3" strokeLinecap="round"/></svg>;

// ─── Shared Components ───────────────────────────────────────────────────────

function Img({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}

// 3D cutout frame — white card with shadow + cropped photo, simulating a product render card
function CutoutFrame({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-[#F5F6F8] shadow-xl shadow-black/10 ${className ?? ""}`}>
      <Img src={src} alt={alt} className="w-full h-full object-cover object-top scale-105" />
      {/* rim light — simulates 3D separation from bg */}
      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/5" />
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white/40 to-transparent" />
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({ page, setPage, company }: { page: Page; setPage: (p: Page) => void; company: Company }) {
  const nav: { id: Page; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "dashboard",      label: "대시보드",        icon: <GridIcon /> },
    { id: "announcements",  label: "공고 목록",        icon: <MegaphoneIcon />, badge: allAnnouncements.length },
    { id: "grants",         label: "지원사업 판정함",  icon: <CheckCircleIcon />, badge: grants.filter(g => g.status === "pass").length },
    { id: "tasks",          label: "오늘 할 일",       icon: <ListIcon />, badge: tasks.filter(t => !t.done).length },
    { id: "expiring",       label: "곧 사라짐",        icon: <ClockIcon />, badge: expiringItems.filter(e => e.expiresIn <= 90).length },
    { id: "calendar",       label: "캘린더",           icon: <CalendarIcon /> },
    { id: "simulator",      label: "직원 시뮬레이터",  icon: <UsersIcon /> },
    { id: "mypage",         label: "마이페이지",        icon: <PersonIcon /> },
  ];

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-[#E4E6EA] flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#E4E6EA]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#6E62C2] flex items-center justify-center shadow-lg shadow-[#6E62C2]/30">
            <span className="text-white font-display font-bold text-sm">B</span>
          </div>
          <span className="text-[#111111] font-display font-bold text-lg tracking-tight">브릿지</span>
          <span className="ml-auto text-[9px] font-mono text-[#6E62C2] bg-[#f0eef9] px-1.5 py-0.5 rounded-full font-semibold">BETA</span>
        </div>
      </div>

      {/* Company chip */}
      <div className="px-4 py-4 border-b border-[#E4E6EA]">
        <div className="bg-[#F5F6F8] rounded-xl px-3 py-3 flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0">
            <Img src={PHOTOS.personCutout} alt="대표자" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="text-[#111111] text-xs font-semibold leading-tight truncate">{company.name}</p>
            <p className="text-[#888888] text-[10px] font-mono mt-0.5">{company.bizNo}</p>
            <div className="flex gap-1 mt-1.5 flex-wrap">
              <span className="text-[9px] text-[#6E62C2] bg-[#f0eef9] px-1.5 py-0.5 rounded-full font-semibold">업력 {company.yearsOld}년</span>
              <span className="text-[9px] text-[#444444] bg-white border border-[#E4E6EA] px-1.5 py-0.5 rounded-full">직원 {company.employees}인</span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {nav.map((item) => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer text-left group ${
              page === item.id
                ? "bg-[#6E62C2] text-white shadow-md shadow-[#6E62C2]/25 font-semibold"
                : "text-[#444444] hover:bg-[#F5F6F8] hover:text-[#111111]"
            }`}
          >
            <span className={`w-4 h-4 shrink-0 ${page === item.id ? "opacity-100" : "opacity-60 group-hover:opacity-80"}`}>{item.icon}</span>
            <span className="flex-1 text-[13px]">{item.label}</span>
            {item.badge !== undefined && (
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-semibold ${page === item.id ? "bg-white/20 text-white" : "bg-[#E4E6EA] text-[#444444]"}`}>{item.badge}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer micro info */}
      <div className="px-4 py-4 border-t border-[#E4E6EA]">
        <p className="text-[10px] text-[#888888] leading-relaxed">
          판정 기준일 2026.09.03<br />
          공고 동기화 2시간 전
        </p>
      </div>
    </aside>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

function Dashboard({ setPage, company }: { setPage: (p: Page) => void; company: Company }) {
  const passCount = grants.filter(g => g.status === "pass").length;
  const conditionalCount = grants.filter(g => g.status === "conditional").length;
  const pendingTasks = tasks.filter(t => !t.done);
  const urgentExpiring = expiringItems.filter(e => e.expiresIn <= 90);

  return (
    <div className="p-6 space-y-5">

      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#111111]">안녕하세요, {company.name.replace("주식회사", "").trim()} 👋</h1>
          <p className="text-[#888888] text-sm mt-1">2026.09.03 기준 자동 판정 결과입니다.</p>
        </div>
        <div className="flex items-center gap-2 bg-[#EEF4F0] border border-[#B2D1BF] rounded-2xl px-4 py-2">
          <span className="w-2 h-2 rounded-full bg-[#EEF4F0]0 animate-pulse" />
          <span className="text-[#2A5A46] text-xs font-semibold">판정 완료</span>
        </div>
      </div>

      {/* ── 알림 배너 ── */}
      <div className="bg-[#fff8f0] border border-orange-200 rounded-2xl px-5 py-3.5 flex items-start gap-3">
        <span className="text-orange-500 text-lg mt-0.5">⚠</span>
        <div className="flex-1">
          <p className="text-[#111111] text-sm font-semibold">초기창업패키지 자격이 55일 후 소멸됩니다</p>
          <p className="text-[#888888] text-xs mt-0.5">업력 3년 조건 만료 전 신청 마감일 2026.09.15</p>
        </div>
        <button onClick={() => setPage("expiring")} className="text-xs font-semibold text-orange-600 hover:text-orange-800 shrink-0 cursor-pointer">자세히 →</button>
      </div>

      {/* ── 요약 숫자 카드 3개 ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "받을 수 있음",   value: passCount,            unit: "건", accent: "#2D6A4F", click: "grants"   as Page },
          { label: "미완료 할 일",   value: pendingTasks.length,  unit: "건", accent: "#4A4A6A", click: "tasks"    as Page },
          { label: "곧 소멸 (3개월)", value: urgentExpiring.length, unit: "건", accent: "#7A4040", click: "expiring" as Page },
        ].map((c) => (
          <button key={c.label} onClick={() => setPage(c.click)}
            className="bg-white border border-[#E4E6EA] rounded-2xl p-5 text-left hover:border-[#D0D3DA] hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer group">
            <p className="text-[#888888] text-[11px] font-medium mb-3">{c.label}</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-display font-bold text-[#111111]">{c.value}</span>
              <span className="text-[#888888] text-sm">{c.unit}</span>
            </div>
            <div className="mt-3 h-0.5 rounded-full w-8 transition-all group-hover:w-12" style={{ backgroundColor: c.accent }} />
          </button>
        ))}
      </div>

      {/* ── 받을 수 있는 지원사업 ── */}
      <div className="bg-[#F5F6F8] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[#111111] font-semibold text-sm">받을 수 있는 지원사업</h2>
          <button onClick={() => setPage("grants")} className="text-xs text-[#6E62C2] font-semibold hover:underline cursor-pointer">전체 →</button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {grants.filter(g => g.status === "pass").slice(0, 3).map(g => (
            <div key={g.id} className="bg-white rounded-xl px-4 py-3 flex flex-col gap-1 border border-[#E4E6EA] shadow-sm">
              <p className="text-[#111111] text-xs font-semibold">{g.name}</p>
              <p className="text-[#888888] text-[11px]">{g.agency}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[#6E62C2] text-xs font-mono font-semibold">{g.amount}</span>
                <span className="text-[#888888] text-[10px]">{g.deadline}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 곧 사라짐 + 오늘 할 일 ── */}
      <div className="grid grid-cols-2 gap-4">

        {/* 곧 사라짐 */}
        <div className="bg-[#F5F6F8] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#111111] font-semibold text-sm">곧 사라질 자격</h2>
            <button onClick={() => setPage("expiring")} className="text-xs text-[#6E62C2] font-semibold hover:underline cursor-pointer">전체 →</button>
          </div>
          <div className="space-y-2">
            {expiringItems.map(item => (
              <div key={item.id} className={`bg-white rounded-xl px-4 py-3 flex items-center gap-3 border shadow-sm ${item.expiresIn <= 60 ? "border-rose-200" : item.expiresIn <= 90 ? "border-amber-200" : "border-[#E4E6EA]"}`}>
                <span className={`text-xs font-mono font-bold shrink-0 w-10 text-center ${item.expiresIn <= 60 ? "text-rose-600" : item.expiresIn <= 90 ? "text-amber-600" : "text-[#888888]"}`}>D-{item.expiresIn}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[#111111] text-xs font-semibold truncate">{item.grantName}</p>
                  <p className="text-[#888888] text-[10px] mt-0.5">{item.axis}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 오늘 할 일 */}
        <div className="bg-[#F5F6F8] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#111111] font-semibold text-sm">오늘 할 일</h2>
            <button onClick={() => setPage("tasks")} className="text-xs text-[#6E62C2] font-semibold hover:underline cursor-pointer">전체 →</button>
          </div>
          <div className="space-y-2">
            {tasks.filter(t => !t.done).slice(0, 3).map(t => (
              <div key={t.id} className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 border border-[#E4E6EA] shadow-sm">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.type === "date" ? "bg-blue-400" : "bg-purple-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[#111111] text-xs font-semibold truncate">{t.title}</p>
                  <p className="text-[#888888] text-[10px] mt-0.5 font-mono">{t.dueDate}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Grants Page ─────────────────────────────────────────────────────────────

const statusLabel: Record<GrantStatus, string> = { pass: "대상", fail: "제외", conditional: "조건부" };
const statusStyle: Record<GrantStatus, string> = {
  pass: "bg-[#EEF4F0] text-[#2A5A46] border-[#B2D1BF]",
  fail: "bg-rose-50 text-rose-600 border-rose-200",
  conditional: "bg-amber-50 text-amber-700 border-amber-200",
};

function GrantsPage() {
  const [category, setCategory] = useState<"grants" | "obligations">("grants");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedPassId, setExpandedPassId] = useState<number | null>(null);
  const localTasks = tasks;

  const passGrants        = grants.filter(g => g.status === "pass");
  const conditionalGrants = grants.filter(g => g.status === "conditional");
  const failGrants        = grants.filter(g => g.status === "fail");

  return (
    <div className="p-6 space-y-5">

      {/* 헤더 */}
      <div className="flex items-end gap-5">
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-[#111111]">판정함</h1>
          <p className="text-[#888888] text-sm mt-1">테크스타트 주식회사 프로필 기준 자동 판정 결과입니다.</p>
        </div>
        <CutoutFrame src={PHOTOS.deskDocuments} alt="서류 책상" className="w-36 h-20 shrink-0" />
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-0 bg-[#F5F6F8] rounded-xl p-1 w-fit border border-[#E4E6EA]">
        {([
          { id: "grants",      label: "지원사업", count: passGrants.length + "건 대상" },
          { id: "obligations", label: "법정의무", count: localTasks.filter(t => !t.done).length + "건 미완료" },
        ] as const).map(cat => (
          <button key={cat.id} onClick={() => setCategory(cat.id)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${category === cat.id ? "bg-white text-[#111111] shadow-sm border border-[#E4E6EA]" : "text-[#888888] hover:text-[#444444]"}`}>
            {cat.label}
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${category === cat.id ? "bg-[#6E62C2]/10 text-[#6E62C2]" : "bg-[#E4E6EA] text-[#888888]"}`}>{cat.count}</span>
          </button>
        ))}
      </div>

      {/* ── 지원사업 판정 ── */}
      {category === "grants" && (
        <div className="space-y-6">

          {/* 대상 — 크고 상세한 카드 */}
          <section>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-2 h-2 rounded-full bg-[#EEF4F0]0 shrink-0" />
              <h2 className="text-sm font-bold text-[#111111]">신청 가능 지원사업</h2>
              <span className="text-xs font-mono text-[#3D7260] bg-[#EEF4F0] border border-[#B2D1BF] px-2 py-0.5 rounded-full">{passGrants.length}건</span>
            </div>

            {passGrants.length === 0 ? (
              <div className="bg-[#F5F6F8] rounded-2xl p-8 text-center text-[#888888] text-sm">해당 조건의 지원사업이 없습니다.</div>
            ) : (
              <div className="grid gap-4">
                {passGrants.map(grant => (
                  <div key={grant.id} className="bg-white border border-[#B2D1BF]/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-[#92BFAA] transition-all">
                    {/* 상단 색상 띠 */}
                    <div className="h-1 bg-gradient-to-r from-[#6FA48E] to-[#4D8C72]" />
                    <div className="p-5">
                      {/* 제목행 */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${statusStyle[grant.status]}`}>{statusLabel[grant.status]}</span>
                            <span className="text-[#888888] text-xs">{grant.agency}</span>
                            {grant.supportType && (
                              <span className="text-[10px] font-medium text-[#6E62C2] bg-[#f0eef9] border border-[#dddaf4] px-2 py-0.5 rounded-full">{grant.supportType}</span>
                            )}
                          </div>
                          <h3 className="text-[#111111] font-bold text-base leading-snug">{grant.name}</h3>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[#111111] text-lg font-bold font-mono leading-none">{grant.amount}</p>
                          <p className="text-[#888888] text-xs mt-1">마감 {grant.deadline}</p>
                        </div>
                      </div>

                      {/* 사업 설명 */}
                      {grant.description && (
                        <p className="text-[#444444] text-xs leading-relaxed mb-4">{grant.description}</p>
                      )}

                      {/* 자격 충족 배너 — 클릭으로 상세 토글 */}
                      <div className="mb-4">
                        <button
                          onClick={() => setExpandedPassId(expandedPassId === grant.id ? null : grant.id)}
                          className="w-full bg-[#EEF4F0] border border-[#B2D1BF] rounded-xl px-4 py-3 text-left hover:bg-[#D8EAE0]/60 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[#3D7260] font-bold text-sm">✓</span>
                              <p className="text-[#2A5A46] text-sm font-semibold">자격 요건 모두 충족</p>
                            </div>
                            <span className={`text-[#3D7260] text-xs font-medium flex items-center gap-1 transition-all ${expandedPassId === grant.id ? "opacity-100" : "opacity-60 group-hover:opacity-100"}`}>
                              {expandedPassId === grant.id ? "접기 ▴" : "상세 보기 ▾"}
                            </span>
                          </div>
                          {expandedPassId !== grant.id && (
                            <p className="text-[#3D7260]/70 text-xs mt-1 ml-5">업력·업종·지역·직원 수·대표자 연령 조건 전부 통과</p>
                          )}
                        </button>

                        {/* 펼쳐진 상세 자격 요건 테이블 */}
                        {expandedPassId === grant.id && grant.eligibility && (
                          <div className="mt-2 border border-[#B2D1BF] rounded-xl overflow-hidden">
                            <div className="grid grid-cols-3 bg-[#D8EAE0]/60 px-4 py-2 text-[10px] font-semibold text-[#2A5A46] uppercase tracking-wide">
                              <span>요건 항목</span>
                              <span>기준 조건</span>
                              <span>우리 회사</span>
                            </div>
                            {grant.eligibility.map((item, i) => (
                              <div key={i} className={`grid grid-cols-3 px-4 py-3 items-center border-t border-[#D8EAE0] ${i % 2 === 0 ? "bg-white" : "bg-[#EEF4F0]/30"}`}>
                                <span className="text-[#444444] text-xs font-medium">{item.label}</span>
                                <span className="text-[#888888] text-xs">{item.required}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold shrink-0 ${item.pass ? "bg-[#EEF4F0]0 text-white" : "bg-rose-400 text-white"}`}>
                                    {item.pass ? "✓" : "✕"}
                                  </span>
                                  <span className={`text-xs font-medium ${item.pass ? "text-[#2A5A46]" : "text-rose-600"}`}>{item.current}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 주요 정보 그리드 */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {[
                          { label: "주관 기관", value: grant.agency },
                          { label: "지원 한도", value: grant.amount },
                          { label: "접수 마감", value: grant.deadline },
                        ].map(item => (
                          <div key={item.label} className="bg-[#F5F6F8] rounded-xl px-3 py-2.5">
                            <p className="text-[10px] text-[#888888] font-medium mb-0.5">{item.label}</p>
                            <p className="text-[#111111] text-xs font-semibold font-mono">{item.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex gap-2">
                        <button className="flex-1 text-center text-sm font-semibold text-white bg-[#6E62C2] hover:bg-[#5a50a8] rounded-xl px-4 py-2.5 transition-colors cursor-pointer">
                          신청 바로가기 →
                        </button>
                        <button className="px-4 py-2.5 text-sm font-medium text-[#6E62C2] bg-[#f0eef9] hover:bg-[#dddaf4] border border-[#dddaf4] rounded-xl transition-colors cursor-pointer">
                          공고 원문
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 조건부 + 제외 — 컴팩트 리스트 */}
          {(conditionalGrants.length > 0 || failGrants.length > 0) && (
            <section>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-2 h-2 rounded-full bg-[#D0D3DA] shrink-0" />
                <h2 className="text-sm font-bold text-[#888888]">기타 지원사업</h2>
                <span className="text-xs font-mono text-[#888888] bg-[#F5F6F8] border border-[#E4E6EA] px-2 py-0.5 rounded-full">{conditionalGrants.length + failGrants.length}건</span>
              </div>
              <div className="space-y-1.5">
                {[...conditionalGrants, ...failGrants].map(grant => (
                  <div key={grant.id} className="bg-white border border-[#E4E6EA] rounded-xl overflow-hidden">
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer hover:bg-[#F5F6F8]/60 transition-colors"
                      onClick={() => setExpandedId(expandedId === grant.id ? null : grant.id)}>
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${statusStyle[grant.status]}`}>{statusLabel[grant.status]}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#444444] font-medium text-sm truncate">{grant.name}</p>
                        <p className="text-[#888888] text-xs mt-0.5">{grant.agency} · {grant.amount}</p>
                      </div>
                      <span className="text-[#888888] text-xs shrink-0">마감 {grant.deadline}</span>
                      <span className={`text-[#888888] text-xs transition-transform ml-1 ${expandedId === grant.id ? "rotate-180" : ""}`}>▾</span>
                    </button>
                    {expandedId === grant.id && (
                      <div className="px-4 pb-4 border-t border-[#E4E6EA]">
                        <div className="pt-3 space-y-2">
                          {grant.status === "conditional" && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                              <p className="text-amber-700 text-xs font-semibold">△ 조건 하나 부족 — {grant.nearMissReason}</p>
                            </div>
                          )}
                          {grant.status === "fail" && (
                            <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5">
                              <p className="text-rose-700 text-xs font-semibold">✕ 자격 미충족 — {grant.failReason}</p>
                            </div>
                          )}
                          <div className="flex gap-2 text-xs">
                            <span className="text-[#6E62C2] bg-[#f0eef9] border border-[#dddaf4] px-3 py-1.5 rounded-lg font-medium cursor-pointer hover:bg-[#dddaf4] transition-colors">공고 원문 보기</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── 법정의무 판정 ── */}
      {category === "obligations" && (
        <div className="space-y-2">
          <div className="bg-[#F5F6F8] rounded-2xl p-4 text-xs text-[#888888]">
            <span className="text-[#111111] font-semibold">판정 기준:</span> 테크스타트 주식회사의 현재 상태(직원 4인, 업력 1년)를 기준으로 발생한 법정 의무 목록입니다.
          </div>
          {localTasks.map(task => (
            <div key={task.id} className="bg-white border border-[#E4E6EA] rounded-2xl px-5 py-4 flex items-start gap-4 shadow-sm hover:border-[#6E62C2]/20 transition-all">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${task.done ? "bg-[#EEF4F0] border border-[#B2D1BF]" : "bg-[#F5F6F8] border border-[#E4E6EA]"}`}>
                {task.done
                  ? <span className="text-[#3D7260] text-xs font-bold">✓</span>
                  : <span className={`w-2 h-2 rounded-full ${task.type === "date" ? "bg-blue-400" : "bg-purple-400"}`} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm font-semibold ${task.done ? "line-through text-[#888888]" : "text-[#111111]"}`}>{task.title}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${task.type === "date" ? "text-blue-700 border-blue-200 bg-blue-50" : "text-purple-700 border-purple-200 bg-purple-50"}`}>
                    {task.type === "date" ? "날짜형" : "이벤트형"}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-[#888888]">
                  <span className="font-mono">{task.dueDate}</span>
                  <span>{task.authority}</span>
                </div>
              </div>
              <span className="text-rose-600 text-[11px] bg-rose-50 border border-rose-200 rounded-lg px-2 py-1 shrink-0 font-medium">{task.penalty}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tasks Page ──────────────────────────────────────────────────────────────

const EMPTY_DRAFT = { title: "", type: "date" as Task["type"], dueDate: "", authority: "", penalty: "" };

function TasksPage({ taskList, setTaskList }: { taskList: Task[]; setTaskList: React.Dispatch<React.SetStateAction<Task[]>> }) {
  const [typeFilter, setTypeFilter] = useState<"all" | "date" | "event">("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Omit<Task, "id" | "done">>(EMPTY_DRAFT);
  const [showAdd, setShowAdd] = useState(false);
  const [addDraft, setAddDraft] = useState<Omit<Task, "id" | "done">>(EMPTY_DRAFT);
  const [nextId, setNextId] = useState(100);

  const toggle = (id: number) =>
    setTaskList(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditDraft({ title: task.title, type: task.type, dueDate: task.dueDate, authority: task.authority, penalty: task.penalty });
    setShowAdd(false);
  };

  const saveEdit = () => {
    setTaskList(prev => prev.map(t => t.id === editingId ? { ...t, ...editDraft } : t));
    setEditingId(null);
  };

  const deleteTask = (id: number) => setTaskList(prev => prev.filter(t => t.id !== id));

  const saveAdd = () => {
    if (!addDraft.title.trim()) return;
    setTaskList(prev => [...prev, { id: nextId, done: false, ...addDraft }]);
    setNextId(n => n + 1);
    setAddDraft(EMPTY_DRAFT);
    setShowAdd(false);
  };

  const filtered = typeFilter === "all" ? taskList : taskList.filter(t => t.type === typeFilter);

  const FormRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center gap-3">
      <span className="text-[#888888] text-xs w-14 shrink-0">{label}</span>
      {children}
    </div>
  );

  const inputCls = "flex-1 border border-[#E4E6EA] rounded-lg px-3 py-1.5 text-sm text-[#111111] focus:outline-none focus:border-[#6E62C2] focus:ring-1 focus:ring-[#6E62C2]/20";
  const selectCls = "border border-[#E4E6EA] rounded-lg px-3 py-1.5 text-sm text-[#111111] focus:outline-none focus:border-[#6E62C2] bg-white cursor-pointer";

  const TaskForm = ({
    draft, setDraft, onSave, onCancel, saveLabel,
  }: {
    draft: Omit<Task, "id" | "done">;
    setDraft: (d: Omit<Task, "id" | "done">) => void;
    onSave: () => void;
    onCancel: () => void;
    saveLabel: string;
  }) => (
    <div className="bg-[#f0eef9] border border-[#6E62C2]/25 rounded-2xl px-5 py-4 space-y-3">
      <FormRow label="제목">
        <input className={inputCls} placeholder="할 일 제목" value={draft.title}
          onChange={e => setDraft({ ...draft, title: e.target.value })} />
      </FormRow>
      <FormRow label="유형">
        <select className={selectCls} value={draft.type}
          onChange={e => setDraft({ ...draft, type: e.target.value as Task["type"] })}>
          <option value="date">날짜형</option>
          <option value="event">이벤트형</option>
        </select>
      </FormRow>
      <FormRow label="기한">
        <input className={inputCls} placeholder="예: 2026.10.25 또는 채용 즉시" value={draft.dueDate}
          onChange={e => setDraft({ ...draft, dueDate: e.target.value })} />
      </FormRow>
      <FormRow label="소관기관">
        <input className={inputCls} placeholder="예: 국세청" value={draft.authority}
          onChange={e => setDraft({ ...draft, authority: e.target.value })} />
      </FormRow>
      <FormRow label="미이행 시">
        <input className={inputCls} placeholder="예: 가산세 20%" value={draft.penalty}
          onChange={e => setDraft({ ...draft, penalty: e.target.value })} />
      </FormRow>
      <div className="flex gap-2 pt-1">
        <button onClick={onSave}
          className="px-4 py-1.5 rounded-xl bg-[#6E62C2] text-white text-xs font-semibold hover:bg-[#5a50a8] transition-colors cursor-pointer shadow-sm">
          {saveLabel}
        </button>
        <button onClick={onCancel}
          className="px-4 py-1.5 rounded-xl bg-white border border-[#E4E6EA] text-[#444444] text-xs font-semibold hover:bg-[#F5F6F8] transition-colors cursor-pointer">
          취소
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-5">

      {/* 헤더 */}
      <div className="relative rounded-3xl overflow-hidden h-36">
        <Img src={PHOTOS.coffeeWork} alt="커피와 서류 작업 자연광" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/60 to-transparent" />
        <div className="absolute inset-0 p-6 flex flex-col justify-center">
          <h1 className="text-2xl font-display font-bold text-[#111111]">오늘 할 일</h1>
          <p className="text-[#444444] text-sm mt-1">법정 의무 신고·신청 현황. 놓치면 과태료가 됩니다.</p>
        </div>
      </div>

      {/* 필터 + 추가 버튼 */}
      <div className="flex items-center gap-2">
        {(["all", "date", "event"] as const).map(f => (
          <button key={f} onClick={() => setTypeFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${typeFilter === f ? "bg-[#6E62C2] text-white border-[#6E62C2] shadow-md shadow-[#6E62C2]/25" : "bg-white border-[#E4E6EA] text-[#444444] hover:border-[#6E62C2]/40"}`}>
            {f === "all" ? "전체" : f === "date" ? "날짜형" : "이벤트형"}
          </button>
        ))}
        <button onClick={() => { setShowAdd(v => !v); setEditingId(null); setAddDraft(EMPTY_DRAFT); }}
          className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#6E62C2] text-white text-xs font-semibold hover:bg-[#5a50a8] transition-colors cursor-pointer shadow-sm">
          + 항목 추가
        </button>
      </div>

      {/* 추가 폼 */}
      {showAdd && (
        <TaskForm draft={addDraft} setDraft={setAddDraft}
          onSave={saveAdd} onCancel={() => setShowAdd(false)} saveLabel="추가" />
      )}

      {/* 목록 */}
      <div className="space-y-2">
        {filtered.map(task => (
          <div key={task.id}>
            {editingId === task.id ? (
              <TaskForm draft={editDraft} setDraft={setEditDraft}
                onSave={saveEdit} onCancel={() => setEditingId(null)} saveLabel="저장" />
            ) : (
              <div className={`bg-white border rounded-2xl px-5 py-4 flex items-start gap-4 shadow-sm transition-all group ${task.done ? "border-[#E4E6EA] opacity-50" : "border-[#E4E6EA] hover:border-[#6E62C2]/25"}`}>
                {/* 체크박스 */}
                <button onClick={() => toggle(task.id)}
                  className={`w-5 h-5 rounded-lg border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all cursor-pointer ${task.done ? "bg-[#6E62C2] border-[#6E62C2]" : "border-[#D0D3DA] hover:border-[#6E62C2]"}`}>
                  {task.done && <span className="text-white text-[10px] font-bold">✓</span>}
                </button>
                {/* 내용 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-semibold ${task.done ? "line-through text-[#888888]" : "text-[#111111]"}`}>{task.title}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${task.type === "date" ? "text-blue-700 border-blue-200 bg-blue-50" : "text-purple-700 border-purple-200 bg-purple-50"}`}>
                      {task.type === "date" ? "날짜형" : "이벤트형"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-[#888888]">
                    <span className="font-mono">{task.dueDate}</span>
                    <span>{task.authority}</span>
                  </div>
                </div>
                {/* 과태료 + 수정·삭제 */}
                <div className="flex items-center gap-2 shrink-0">
                  {task.penalty && (
                    <span className="text-rose-600 text-[11px] bg-rose-50 border border-rose-200 rounded-lg px-2 py-1 font-medium">{task.penalty}</span>
                  )}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(task)}
                      className="w-7 h-7 rounded-lg border border-[#E4E6EA] bg-white text-[#888888] hover:text-[#6E62C2] hover:border-[#6E62C2]/40 flex items-center justify-center text-xs transition-colors cursor-pointer"
                      title="수정">✎</button>
                    <button onClick={() => deleteTask(task.id)}
                      className="w-7 h-7 rounded-lg border border-[#E4E6EA] bg-white text-[#888888] hover:text-rose-600 hover:border-rose-200 flex items-center justify-center text-xs transition-colors cursor-pointer"
                      title="삭제">✕</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="bg-[#F5F6F8] rounded-2xl p-10 text-center">
            <p className="text-[#888888] text-sm">할 일이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Calendar Page ───────────────────────────────────────────────────────────

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

function parseDate(s: string): Date | null {
  const m = s.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function CalendarPage({ taskList, setTaskList }: { taskList: Task[]; setTaskList: React.Dispatch<React.SetStateAction<Task[]>> }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Omit<Task, "id" | "done">>(EMPTY_DRAFT);
  const [showAdd, setShowAdd] = useState(false);
  const [addDraft, setAddDraft] = useState<Omit<Task, "id" | "done">>(EMPTY_DRAFT);
  const [nextId, setNextId] = useState(200);

  // 달력 그리드 계산
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const tasksByDate = (day: number) => {
    const key = fmtDate(new Date(viewYear, viewMonth, day));
    return taskList.filter(t => t.dueDate === key);
  };

  const isToday = (day: number) =>
    today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;

  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); } else setViewMonth(m => m + 1); };

  const selectedTasks = selectedDate ? taskList.filter(t => t.dueDate === selectedDate) : [];
  const importantTasks = taskList.filter(t => t.penalty && parseDate(t.dueDate));

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditDraft({ title: task.title, type: task.type, dueDate: task.dueDate, authority: task.authority, penalty: task.penalty });
    setShowAdd(false);
  };
  const saveEdit = () => {
    setTaskList(prev => prev.map(t => t.id === editingId ? { ...t, ...editDraft } : t));
    setEditingId(null);
  };
  const deleteTask = (id: number) => setTaskList(prev => prev.filter(t => t.id !== id));
  const saveAdd = () => {
    if (!addDraft.title.trim()) return;
    setTaskList(prev => [...prev, { id: nextId, done: false, ...addDraft }]);
    setNextId(n => n + 1);
    setAddDraft(EMPTY_DRAFT);
    setShowAdd(false);
  };

  const inputCls = "w-full border border-[#E4E6EA] rounded-lg px-3 py-1.5 text-xs text-[#111111] focus:outline-none focus:border-[#6E62C2] focus:ring-1 focus:ring-[#6E62C2]/20";
  const selectCls = "w-full border border-[#E4E6EA] rounded-lg px-3 py-1.5 text-xs text-[#111111] focus:outline-none focus:border-[#6E62C2] bg-white cursor-pointer";

  const MiniForm = ({ draft, setDraft, onSave, onCancel, label }: {
    draft: Omit<Task, "id" | "done">; setDraft: (d: Omit<Task, "id" | "done">) => void;
    onSave: () => void; onCancel: () => void; label: string;
  }) => (
    <div className="bg-[#f0eef9] border border-[#6E62C2]/25 rounded-xl p-3 space-y-2 mt-2">
      <input className={inputCls} placeholder="제목" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <select className={selectCls} value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value as Task["type"] })}>
          <option value="date">날짜형</option>
          <option value="event">이벤트형</option>
        </select>
        <input className={inputCls} placeholder="기한 (2026.10.25)" value={draft.dueDate} onChange={e => setDraft({ ...draft, dueDate: e.target.value })} />
      </div>
      <input className={inputCls} placeholder="소관기관" value={draft.authority} onChange={e => setDraft({ ...draft, authority: e.target.value })} />
      <input className={inputCls} placeholder="미이행 시 페널티" value={draft.penalty} onChange={e => setDraft({ ...draft, penalty: e.target.value })} />
      <div className="flex gap-2">
        <button onClick={onSave} className="px-3 py-1 rounded-lg bg-[#6E62C2] text-white text-[11px] font-semibold hover:bg-[#5a50a8] cursor-pointer">{label}</button>
        <button onClick={onCancel} className="px-3 py-1 rounded-lg border border-[#E4E6EA] text-[#444444] text-[11px] font-semibold hover:bg-[#F5F6F8] cursor-pointer">취소</button>
      </div>
    </div>
  );

  return (
    <div className="p-6 flex gap-5 h-full overflow-hidden">

      {/* ── 캘린더 본체 ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 월 네비게이션 */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-display font-bold text-[#111111]">
              {viewYear}년 {viewMonth + 1}월
            </h1>
            <p className="text-[#888888] text-xs mt-0.5">날짜를 클릭해 일정을 확인하세요</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); }}
              className="px-3 py-1.5 rounded-xl border border-[#E4E6EA] text-xs font-semibold text-[#444444] hover:bg-[#F5F6F8] cursor-pointer">
              오늘
            </button>
            <button onClick={prevMonth} className="w-8 h-8 rounded-xl border border-[#E4E6EA] flex items-center justify-center text-[#444444] hover:bg-[#F5F6F8] cursor-pointer">‹</button>
            <button onClick={nextMonth} className="w-8 h-8 rounded-xl border border-[#E4E6EA] flex items-center justify-center text-[#444444] hover:bg-[#F5F6F8] cursor-pointer">›</button>
          </div>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map((d, i) => (
            <div key={d} className={`text-center text-[11px] font-semibold py-1.5 ${i === 0 ? "text-rose-400" : i === 6 ? "text-blue-400" : "text-[#888888]"}`}>{d}</div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-px bg-[#E4E6EA] rounded-2xl overflow-hidden flex-1">
          {cells.map((day, idx) => {
            if (!day) return <div key={idx} className="bg-[#F5F6F8]" />;
            const dateStr = fmtDate(new Date(viewYear, viewMonth, day));
            const dayTasks = tasksByDate(day);
            const importantOnes = dayTasks.filter(t => t.penalty);
            const isSelected = selectedDate === dateStr;
            const dow = (firstDay + day - 1) % 7;

            return (
              <button key={idx} onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`bg-white p-2 flex flex-col items-start text-left transition-all cursor-pointer hover:bg-[#f0eef9] ${isSelected ? "bg-[#f0eef9] ring-2 ring-inset ring-[#6E62C2]" : ""}`}>
                <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday(day) ? "bg-[#6E62C2] text-white" : dow === 0 ? "text-rose-500" : dow === 6 ? "text-blue-500" : "text-[#111111]"}`}>
                  {day}
                </span>
                {/* 중요 법정의무 도트 */}
                {importantOnes.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 w-full">
                    {importantOnes.slice(0, 2).map(t => (
                      <span key={t.id} className="w-full truncate text-[9px] font-medium bg-rose-50 text-rose-600 border border-rose-200 rounded px-1 leading-4">{t.title}</span>
                    ))}
                    {importantOnes.length > 2 && <span className="text-[9px] text-[#888888]">+{importantOnes.length - 2}</span>}
                  </div>
                )}
                {/* 일반 일정 도트 */}
                {dayTasks.filter(t => !t.penalty).length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayTasks.filter(t => !t.penalty).slice(0, 3).map(t => (
                      <span key={t.id} className={`w-1.5 h-1.5 rounded-full ${t.type === "date" ? "bg-blue-400" : "bg-purple-400"}`} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* 범례 */}
        <div className="flex items-center gap-4 mt-3 text-[10px] text-[#888888]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-rose-100 border border-rose-300 inline-block" />중요 법정의무</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />날짜형</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block" />이벤트형</span>
        </div>
      </div>

      {/* ── 사이드 패널 ── */}
      <div className="w-72 shrink-0 flex flex-col gap-4 overflow-y-auto">

        {/* 선택된 날 또는 이번달 요약 */}
        {selectedDate ? (
          <div className="bg-white border border-[#E4E6EA] rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-[#E4E6EA] flex items-center justify-between">
              <div>
                <p className="text-[11px] text-[#888888]">선택한 날짜</p>
                <p className="text-sm font-semibold text-[#111111]">{selectedDate}</p>
              </div>
              <button onClick={() => { setShowAdd(true); setAddDraft({ ...EMPTY_DRAFT, dueDate: selectedDate }); setEditingId(null); }}
                className="px-3 py-1.5 rounded-xl bg-[#6E62C2] text-white text-[11px] font-semibold hover:bg-[#5a50a8] cursor-pointer">
                + 추가
              </button>
            </div>

            {showAdd && (
              <div className="px-4 py-3 border-b border-[#E4E6EA]">
                <MiniForm draft={addDraft} setDraft={setAddDraft} onSave={saveAdd} onCancel={() => setShowAdd(false)} label="추가" />
              </div>
            )}

            <div className="divide-y divide-[#F5F6F8]">
              {selectedTasks.length === 0 && !showAdd && (
                <p className="px-4 py-6 text-center text-[#888888] text-xs">이 날 등록된 일정이 없습니다.</p>
              )}
              {selectedTasks.map(task => (
                <div key={task.id} className="px-4 py-3">
                  {editingId === task.id ? (
                    <MiniForm draft={editDraft} setDraft={setEditDraft} onSave={saveEdit} onCancel={() => setEditingId(null)} label="저장" />
                  ) : (
                    <div className="group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#111111] leading-tight">{task.title}</p>
                          <p className="text-[10px] text-[#888888] mt-0.5">{task.authority}</p>
                          {task.penalty && <p className="text-[10px] text-rose-600 mt-0.5">{task.penalty}</p>}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={() => startEdit(task)} className="w-6 h-6 rounded-lg border border-[#E4E6EA] text-[#888888] hover:text-[#6E62C2] flex items-center justify-center text-[10px] cursor-pointer">✎</button>
                          <button onClick={() => deleteTask(task.id)} className="w-6 h-6 rounded-lg border border-[#E4E6EA] text-[#888888] hover:text-rose-600 flex items-center justify-center text-[10px] cursor-pointer">✕</button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${task.done ? "bg-[#EEF4F0] text-[#2A5A46] border-[#B2D1BF]" : "bg-[#F5F6F8] text-[#888888] border-[#E4E6EA]"}`}>
                          {task.done ? "완료" : "미완료"}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${task.type === "date" ? "text-blue-700 border-blue-200 bg-blue-50" : "text-purple-700 border-purple-200 bg-purple-50"}`}>
                          {task.type === "date" ? "날짜형" : "이벤트형"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-[#F5F6F8] border border-[#E4E6EA] rounded-2xl px-4 py-4">
            <p className="text-[#888888] text-xs">날짜를 클릭하면<br />해당 날의 일정을 확인하고<br />추가·수정·삭제할 수 있습니다.</p>
          </div>
        )}

        {/* 이번달 중요 법정의무 요약 */}
        <div className="bg-white border border-[#E4E6EA] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E4E6EA]">
            <p className="text-xs font-semibold text-[#111111]">중요 법정의무</p>
            <p className="text-[10px] text-[#888888] mt-0.5">페널티가 있는 일정</p>
          </div>
          <div className="divide-y divide-[#F5F6F8] max-h-64 overflow-y-auto">
            {importantTasks.length === 0 && (
              <p className="px-4 py-4 text-center text-[#888888] text-xs">해당 없음</p>
            )}
            {importantTasks.map(task => {
              const d = parseDate(task.dueDate);
              const isThisMonth = d && d.getFullYear() === viewYear && d.getMonth() === viewMonth;
              return (
                <button key={task.id} onClick={() => setSelectedDate(task.dueDate)}
                  className={`w-full text-left px-4 py-3 hover:bg-[#F5F6F8] transition-colors cursor-pointer ${isThisMonth ? "" : "opacity-50"}`}>
                  <p className="text-[11px] font-semibold text-[#111111] truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-[#888888]">{task.dueDate}</span>
                    <span className="text-[9px] text-rose-600 truncate">{task.penalty}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 이번달 통계 */}
        <div className="bg-white border border-[#E4E6EA] rounded-2xl shadow-sm px-4 py-4">
          <p className="text-xs font-semibold text-[#111111] mb-3">{viewMonth + 1}월 통계</p>
          <div className="space-y-2">
            {[
              { label: "전체 일정", value: taskList.filter(t => { const d = parseDate(t.dueDate); return d && d.getFullYear() === viewYear && d.getMonth() === viewMonth; }).length },
              { label: "중요 법정의무", value: importantTasks.filter(t => { const d = parseDate(t.dueDate); return d && d.getFullYear() === viewYear && d.getMonth() === viewMonth; }).length },
              { label: "완료", value: taskList.filter(t => { const d = parseDate(t.dueDate); return d && d.getFullYear() === viewYear && d.getMonth() === viewMonth && t.done; }).length },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-[11px] text-[#888888]">{row.label}</span>
                <span className="text-sm font-display font-bold text-[#111111]">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Expiring Page ───────────────────────────────────────────────────────────

function ExpiringPage() {
  return (
    <div className="p-6 space-y-5">

      {/* 헤더 — 3D cutout 스타일 */}
      <div className="flex items-start gap-5">
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-[#111111]">곧 사라짐</h1>
          <p className="text-[#888888] text-sm mt-1">만료 3개월 전 미리 알려드립니다. 지나가면 다시 받지 못합니다.</p>
        </div>
        <CutoutFrame src={PHOTOS.plantDesk} alt="책상 위 식물 자연광" className="w-28 h-20 shrink-0" />
      </div>

      <div className="space-y-4">
        {expiringItems.map((item, i) => (
          <div key={item.id} className={`rounded-3xl overflow-hidden border shadow-sm ${item.expiresIn <= 60 ? "border-rose-200" : item.expiresIn <= 90 ? "border-amber-200" : "border-[#E4E6EA]"}`}>

            {/* 라이프스타일 / 3D 컷 교차 */}
            {i % 2 === 0 ? (
              <div className="relative h-28">
                <Img
                  src={i === 0 ? PHOTOS.teamMeeting : PHOTOS.heroLifestyle}
                  alt="자연광 라이프스타일"
                  className="w-full h-full object-cover"
                />
                <div className={`absolute inset-0 ${item.expiresIn <= 60 ? "bg-rose-900/50" : "bg-amber-900/40"} mix-blend-multiply`} />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
                <div className="absolute bottom-3 left-5 flex items-center gap-2">
                  <span className={`text-white font-mono font-bold text-2xl`}>D-{item.expiresIn}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${item.axis === "업력" ? "bg-blue-500 text-white" : item.axis === "대표자연령" ? "bg-purple-500 text-white" : "bg-green-500 text-white"}`}>{item.axis}</span>
                </div>
              </div>
            ) : (
              <div className={`h-20 flex items-center px-5 gap-4 ${item.expiresIn <= 60 ? "bg-rose-50" : item.expiresIn <= 90 ? "bg-amber-50" : "bg-[#F5F6F8]"}`}>
                <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-display shrink-0 shadow-sm ${item.expiresIn <= 60 ? "bg-rose-500 text-white shadow-rose-200" : item.expiresIn <= 90 ? "bg-amber-500 text-white shadow-amber-200" : "bg-[#6E62C2] text-white shadow-[#6E62C2]/20"}`}>
                  <span className="text-[9px] opacity-70">D-</span>
                  <span className="text-lg font-bold leading-none">{item.expiresIn}</span>
                </div>
                <div>
                  <p className={`text-sm font-semibold ${item.expiresIn <= 60 ? "text-rose-700" : "text-amber-700"}`}>{item.grantName}</p>
                  <p className="text-[#888888] text-xs">{item.axis} 기준</p>
                </div>
              </div>
            )}

            {/* 상세 */}
            <div className="bg-white px-5 py-4">
              <p className="text-[#111111] font-semibold text-sm">{item.grantName}</p>
              <p className="text-[#888888] text-xs mt-1">{item.reason}</p>
              {item.expiresIn <= 90 && (
                <button className="mt-3 text-xs font-semibold bg-[#6E62C2] hover:bg-[#5a50a8] text-white px-4 py-2 rounded-xl transition-colors cursor-pointer shadow-md shadow-[#6E62C2]/25">
                  지금 신청하기 →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#F5F6F8] rounded-2xl p-4">
        <p className="text-[#888888] text-xs leading-relaxed">
          <span className="text-[#111111] font-semibold">판정 기준:</span> 업력(개업일), 대표자 연령, 상시근로자 수 세 축으로 만료 시점 계산.
          90일·30일·7일 전 이메일·앱 푸시 알림 발송. 마이페이지에서 설정 변경 가능.
        </p>
      </div>
    </div>
  );
}

// ─── Simulator Page ──────────────────────────────────────────────────────────

const employeeRules: Record<number, { newObligations: string[]; lostGrants: string[] }> = {
  5: {
    newObligations: ["직장 내 괴롭힘 방지 교육 의무화", "취업규칙 작성·신고 의무", "연차유급휴가 법정 부여"],
    lostGrants: ["소공인 특화자금 (5인 미만 조건)"],
  },
  10: {
    newObligations: ["장애인고용부담금 납부 의무 (2.7% 미달 시)", "고용촉진장려금 심사 기준 변경"],
    lostGrants: ["혁신창업스쿨 (5~9인 구간 한정)", "소기업 전용 R&D 바우처"],
  },
  30: {
    newObligations: ["의무적 안전보건관리체계 구축", "고용형태 공시 의무"],
    lostGrants: ["창업도약패키지 (30인 미만 우대 기준 초과)"],
  },
};

function SimulatorPage({ company }: { company: Company }) {
  const [simEmployees, setSimEmployees] = useState(company.employees);

  const getChanges = (from: number, to: number) => {
    const thresholds = [5, 10, 30].filter(t => from < t && to >= t);
    const obligations: string[] = [];
    const lostGrants: string[] = [];
    thresholds.forEach(t => {
      obligations.push(...(employeeRules[t]?.newObligations ?? []));
      lostGrants.push(...(employeeRules[t]?.lostGrants ?? []));
    });
    return { obligations, lostGrants };
  };

  const changes = getChanges(company.employees, simEmployees);
  const hasChange = simEmployees !== company.employees;

  return (
    <div className="p-6 space-y-5">

      {/* 헤더 — lifestyle 가로 배너 */}
      <div className="relative rounded-3xl overflow-hidden h-36">
        <Img src={PHOTOS.teamMeeting} alt="팀 미팅 자연광" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/50 to-transparent" />
        <div className="absolute inset-0 p-6 flex flex-col justify-center">
          <h1 className="text-2xl font-display font-bold text-[#111111]">직원 시뮬레이터</h1>
          <p className="text-[#444444] text-sm mt-1">뽑기 전에 의무와 자격 변화를 먼저 확인하세요.</p>
        </div>
      </div>

      {/* 슬라이더 카드 */}
      <div className="bg-white border border-[#E4E6EA] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="text-center flex-1">
            <p className="text-[#888888] text-xs mb-1">현재</p>
            <p className="text-3xl font-display font-bold text-[#111111]">{company.employees}<span className="text-lg text-[#888888] ml-1">인</span></p>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <svg className="w-6 h-6 text-[#6E62C2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
          </div>
          <div className="text-center flex-1">
            <p className="text-[#888888] text-xs mb-1">시뮬레이션</p>
            <p className={`text-3xl font-display font-bold font-mono ${simEmployees > company.employees ? "text-amber-600" : simEmployees < company.employees ? "text-blue-600" : "text-[#111111]"}`}>{simEmployees}<span className="text-lg text-[#888888] ml-1">인</span></p>
          </div>
        </div>

        <input type="range" min={1} max={50} value={simEmployees}
          onChange={e => setSimEmployees(Number(e.target.value))}
          className="w-full accent-[#6E62C2]" />
        <div className="flex justify-between text-[10px] text-[#888888] mt-1 font-mono px-0.5">
          {[1, 5, 10, 20, 30, 50].map(n => <span key={n}>{n}</span>)}
        </div>

        <div className="flex gap-2 mt-4 flex-wrap">
          {[{ n: 5, label: "5인" }, { n: 10, label: "10인" }, { n: 30, label: "30인" }].map(m => (
            <button key={m.n} onClick={() => setSimEmployees(m.n)}
              className={`text-xs px-3 py-1.5 rounded-xl border font-semibold transition-all cursor-pointer ${simEmployees >= m.n && company.employees < m.n ? "bg-[#6E62C2] text-white border-[#6E62C2] shadow-md shadow-[#6E62C2]/25" : "border-[#E4E6EA] text-[#444444] hover:border-[#6E62C2]/40 bg-[#F5F6F8]"}`}>
              {m.label} 구간
            </button>
          ))}
        </div>
      </div>

      {/* 결과 */}
      {hasChange ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-amber-600">⚡</span>
              <h3 className="text-[#111111] font-semibold text-sm">새로 생기는 법정 의무</h3>
              <span className="ml-auto text-xs font-mono font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">{changes.obligations.length}</span>
            </div>
            {changes.obligations.length > 0 ? (
              <ul className="space-y-2">
                {changes.obligations.map((ob, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-amber-500 mt-0.5 shrink-0">▸</span>
                    <span className="text-[#444444]">{ob}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-[#888888] text-sm">이 구간에서 새 의무 없음</p>}
          </div>

          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-rose-500">✕</span>
              <h3 className="text-[#111111] font-semibold text-sm">사라지는 지원 자격</h3>
              <span className="ml-auto text-xs font-mono font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-full">{changes.lostGrants.length}</span>
            </div>
            {changes.lostGrants.length > 0 ? (
              <ul className="space-y-2">
                {changes.lostGrants.map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-rose-400 mt-0.5 shrink-0">▸</span>
                    <span className="text-[#444444]">{g}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-[#888888] text-sm">소멸되는 자격 없음</p>}
          </div>
        </div>
      ) : (
        <div className="bg-[#F5F6F8] border border-[#E4E6EA] rounded-2xl p-8 text-center">
          <p className="text-[#888888]">슬라이더를 움직여 인원 변화 시나리오를 확인하세요</p>
          <p className="text-[#888888]/60 text-sm mt-1">5인·10인·30인 구간을 넘을 때 의무와 자격이 동시에 바뀝니다</p>
        </div>
      )}

      {/* 3D 컷 + 안내 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { n: "5인", desc: "취업규칙 의무, 연차 법정 부여, 직장내 괴롭힘 방지교육" },
          { n: "10인", desc: "장애인고용부담금, 일부 R&D 지원사업 기준 변경" },
          { n: "30인", desc: "고용형태 공시, 안전보건관리체계 구축 의무" },
        ].map(t => (
          <div key={t.n} className="bg-[#F5F6F8] rounded-2xl p-4 border border-[#E4E6EA]">
            <span className="text-[#6E62C2] font-mono font-bold text-base">{t.n}</span>
            <p className="text-[#888888] text-[11px] mt-1.5 leading-relaxed">{t.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Announcements Page ───────────────────────────────────────────────────────

const annStatusLabel: Record<AnnouncementStatus, string> = { open: "접수중", closing: "마감임박", closed: "마감" };
const annStatusStyle: Record<AnnouncementStatus, string> = {
  open:    "bg-blue-50 text-blue-700 border-blue-200",
  closing: "bg-rose-50 text-rose-700 border-rose-200",
  closed:  "bg-[#F5F6F8] text-[#888888] border-[#E4E6EA]",
};
const fieldColors: Record<AnnouncementField, string> = {
  "전체": "",
  "창업": "bg-violet-50 text-violet-700 border-violet-200",
  "R&D":  "bg-blue-50 text-blue-700 border-blue-200",
  "수출": "bg-sky-50 text-sky-700 border-sky-200",
  "고용": "bg-teal-50 text-teal-700 border-teal-200",
  "금융": "bg-orange-50 text-orange-700 border-orange-200",
};

type SortKey = "deadline" | "eligible" | "latest";

const sortLabels: Record<SortKey, string> = {
  deadline: "마감임박순",
  eligible: "적합도순",
  latest:   "최신순",
};

const statusOrder: Record<AnnouncementStatus, number> = { closing: 0, open: 1, closed: 2 };

function AnnouncementsPage() {
  const [statusFilter, setStatusFilter] = useState<AnnouncementStatus | "all">("all");
  const [fieldFilter, setFieldFilter]   = useState<AnnouncementField | "전체">("전체");
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("deadline");

  const fields: (AnnouncementField | "전체")[] = ["전체", "창업", "R&D", "수출", "고용", "금융"];

  const filtered = allAnnouncements
    .filter(a => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (fieldFilter !== "전체" && a.field !== fieldFilter) return false;
      if (eligibleOnly && !a.eligible) return false;
      if (search && !a.title.includes(search) && !a.agency.includes(search)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "deadline") return statusOrder[a.status] - statusOrder[b.status];
      if (sort === "eligible") return (b.eligible ? 1 : 0) - (a.eligible ? 1 : 0);
      return b.id - a.id; // latest: 높은 id가 최신
    });

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold text-[#111111]">공고 목록</h1>
        <p className="text-[#888888] text-sm mt-1">수집된 지원사업 공고 전체입니다. 필터로 범위를 좁혀 보세요.</p>
      </div>

      {/* 검색 + 필터 */}
      <div className="space-y-3">
        <input
          type="text"
          placeholder="공고명·기관명 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-[#E4E6EA] rounded-xl px-4 py-2.5 text-sm text-[#111111] placeholder-[#888888] focus:outline-none focus:border-[#6E62C2] focus:ring-2 focus:ring-[#6E62C2]/10"
        />
        <div className="flex items-center gap-2 flex-wrap">
          {/* 정렬 */}
          <div className="flex gap-1 bg-[#F5F6F8] border border-[#E4E6EA] rounded-xl p-1">
            {(["deadline", "eligible", "latest"] as SortKey[]).map(s => (
              <button key={s} onClick={() => setSort(s)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${sort === s ? "bg-white text-[#111111] shadow-sm border border-[#E4E6EA]" : "text-[#888888] hover:text-[#444444]"}`}>
                {sortLabels[s]}
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-[#E4E6EA]" />
          {/* 상태 필터 */}
          {(["all", "open", "closing", "closed"] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${statusFilter === s ? "bg-[#6E62C2] text-white border-[#6E62C2] shadow-sm" : "bg-white border-[#E4E6EA] text-[#444444] hover:border-[#6E62C2]/40"}`}>
              {s === "all" ? "전체 상태" : annStatusLabel[s]}
            </button>
          ))}
          <div className="w-px h-4 bg-[#E4E6EA]" />
          {/* 분야 필터 */}
          {fields.filter(f => f !== "전체").map(f => (
            <button key={f} onClick={() => setFieldFilter(fieldFilter === f ? "전체" : f)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${fieldFilter === f ? "bg-[#6E62C2] text-white border-[#6E62C2] shadow-sm" : `bg-white ${fieldColors[f as AnnouncementField]} hover:opacity-80`}`}>
              {f}
            </button>
          ))}
          <div className="w-px h-4 bg-[#E4E6EA]" />
          {/* 우리 기업 대상만 */}
          <button onClick={() => setEligibleOnly(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${eligibleOnly ? "bg-[#3D7260] text-white border-[#3D7260] shadow-sm" : "bg-white border-[#E4E6EA] text-[#444444] hover:border-[#6FA48E]"}`}>
            <span>{eligibleOnly ? "✓" : ""}</span>우리 기업 대상만
          </button>
        </div>
      </div>

      {/* 결과 수 */}
      <p className="text-[#888888] text-xs">
        총 <span className="text-[#111111] font-semibold">{filtered.length}</span>건
        {eligibleOnly && <span className="ml-1 text-[#3D7260]">· 우리 기업 대상</span>}
      </p>

      {/* 공고 목록 */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-[#F5F6F8] rounded-2xl p-10 text-center">
            <p className="text-[#888888] text-sm">조건에 맞는 공고가 없습니다.</p>
          </div>
        ) : filtered.map(ann => (
          <div key={ann.id} className={`bg-white border rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm hover:border-[#6E62C2]/30 transition-all ${ann.status === "closed" ? "opacity-60" : "border-[#E4E6EA]"}`}>
            {/* 상태 뱃지 */}
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${annStatusStyle[ann.status]}`}>
              {annStatusLabel[ann.status]}
            </span>

            {/* 본문 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[#111111] font-semibold text-sm">{ann.title}</p>
                {ann.eligible && (
                  <span className="text-[10px] font-semibold text-[#2A5A46] bg-[#EEF4F0] border border-[#B2D1BF] px-1.5 py-0.5 rounded-full">대상</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-[#888888]">
                <span>{ann.agency}</span>
                <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${fieldColors[ann.field]}`}>{ann.field}</span>
                <span className="font-mono">{ann.startDate} ~ {ann.endDate}</span>
              </div>
            </div>

            {/* 금액 + 원문 링크 */}
            <div className="text-right shrink-0 space-y-1">
              <p className="text-[#6E62C2] text-sm font-mono font-semibold">{ann.amount}</p>
              <button className="text-[11px] text-[#888888] hover:text-[#6E62C2] transition-colors cursor-pointer">원문 보기 →</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MyPage ──────────────────────────────────────────────────────────────────

type NotifKey = "expiring" | "deadline" | "newGrant" | "task";

function MyPage({ company, onSave }: { company: Company; onSave: (c: Company) => void }) {
  const [profile, setProfile] = useState({ ...company });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ ...company });
  const [notifs, setNotifs] = useState<Record<NotifKey, boolean>>({
    expiring: true,
    deadline: true,
    newGrant: false,
    task: true,
  });
  const [notifChannel, setNotifChannel] = useState<Record<"email" | "push", boolean>>({ email: true, push: false });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setProfile({ ...draft });
    onSave({ ...draft });
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const notifItems: { key: NotifKey; label: string; desc: string }[] = [
    { key: "expiring", label: "곧 사라짐 알림", desc: "자격 만료 90일·30일·7일 전 발송" },
    { key: "deadline", label: "공고 마감 임박 알림", desc: "마감 7일 전 대상 공고 알림" },
    { key: "newGrant", label: "신규 공고 알림", desc: "새 지원사업 공고 등록 시 발송" },
    { key: "task", label: "법정 의무 알림", desc: "신고·납부 기한 3일 전 발송" },
  ];

  const historyRows = [
    { date: "2026.09.03", event: "전체 판정 실행", result: "지원사업 3건 대상, 2건 조건부" },
    { date: "2026.08.15", event: "직원 수 변경", result: "3인 → 4인, 재판정 완료" },
    { date: "2026.07.01", event: "프로필 최초 등록", result: "온보딩 완료" },
  ];

  return (
    <div className="p-6 space-y-5">

      {/* 헤더 — 3D cutout 스타일 */}
      <div className="relative rounded-3xl overflow-hidden h-36">
        <Img src={PHOTOS.laptopSunlight} alt="자연광 작업 공간" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/50 to-transparent" />
        <div className="absolute inset-0 p-6 flex flex-col justify-center">
          <h1 className="text-2xl font-display font-bold text-[#111111]">마이페이지</h1>
          <p className="text-[#444444] text-sm mt-1">기업 프로필·알림 설정·판정 이력을 관리합니다.</p>
        </div>
      </div>

      {/* ── 기업 프로필 ── */}
      <div className="bg-white border border-[#E4E6EA] rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E4E6EA]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#E4E6EA]">
              <Img src={PHOTOS.personCutout} alt="대표자" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-[#111111] font-semibold text-sm">{profile.name}</p>
              <p className="text-[#888888] text-xs font-mono">{profile.bizNo}</p>
            </div>
          </div>
          {!editing ? (
            <button
              onClick={() => { setDraft({ ...profile }); setEditing(true); }}
              className="text-xs font-semibold text-[#6E62C2] bg-[#f0eef9] border border-[#dddaf4] px-3 py-1.5 rounded-xl hover:bg-[#dddaf4] transition-colors cursor-pointer"
            >
              수정
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="text-xs font-semibold text-[#888888] bg-[#F5F6F8] border border-[#E4E6EA] px-3 py-1.5 rounded-xl hover:bg-[#E4E6EA] transition-colors cursor-pointer">취소</button>
              <button onClick={handleSave} className="text-xs font-semibold text-white bg-[#6E62C2] px-3 py-1.5 rounded-xl hover:bg-[#5a50a8] transition-colors cursor-pointer shadow-md shadow-[#6E62C2]/25">저장</button>
            </div>
          )}
        </div>

        {saved && (
          <div className="mx-5 mt-4 bg-[#EEF4F0] border border-[#B2D1BF] rounded-xl px-4 py-2 flex items-center gap-2">
            <span className="text-[#3D7260] text-sm">✓</span>
            <p className="text-[#2A5A46] text-xs font-semibold">저장됐습니다. 변경된 항목으로 재판정을 실행합니다.</p>
          </div>
        )}

        <div className="px-5 py-4 grid grid-cols-2 gap-4">
          {[
            { label: "업종", field: "sector" as const },
            { label: "지역", field: "region" as const },
            { label: "개업일", field: "foundedDate" as const },
            { label: "사업자번호", field: "bizNo" as const },
          ].map(({ label, field }) => (
            <div key={field}>
              <p className="text-[#888888] text-[11px] font-medium mb-1">{label}</p>
              {editing && field !== "bizNo" ? (
                <input
                  value={draft[field] as string}
                  onChange={e => setDraft(d => ({ ...d, [field]: e.target.value }))}
                  className="w-full border border-[#E4E6EA] rounded-lg px-3 py-1.5 text-sm text-[#111111] focus:outline-none focus:border-[#6E62C2] focus:ring-1 focus:ring-[#6E62C2]/20"
                />
              ) : (
                <p className="text-[#111111] text-sm font-medium">{profile[field] as string}</p>
              )}
            </div>
          ))}
          <div>
            <p className="text-[#888888] text-[11px] font-medium mb-1">상시근로자 수</p>
            {editing ? (
              <input
                type="number" min={0} max={999}
                value={draft.employees}
                onChange={e => setDraft(d => ({ ...d, employees: Number(e.target.value) }))}
                className="w-full border border-[#E4E6EA] rounded-lg px-3 py-1.5 text-sm text-[#111111] focus:outline-none focus:border-[#6E62C2] focus:ring-1 focus:ring-[#6E62C2]/20"
              />
            ) : (
              <p className="text-[#111111] text-sm font-medium">{profile.employees}인</p>
            )}
          </div>
          <div>
            <p className="text-[#888888] text-[11px] font-medium mb-1">대표자 연령</p>
            {editing ? (
              <input
                type="number" min={20} max={99}
                value={draft.ceoAge}
                onChange={e => setDraft(d => ({ ...d, ceoAge: Number(e.target.value) }))}
                className="w-full border border-[#E4E6EA] rounded-lg px-3 py-1.5 text-sm text-[#111111] focus:outline-none focus:border-[#6E62C2] focus:ring-1 focus:ring-[#6E62C2]/20"
              />
            ) : (
              <p className="text-[#111111] text-sm font-medium">만 {profile.ceoAge}세</p>
            )}
          </div>
        </div>

        {editing && (
          <div className="mx-5 mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
            <p className="text-amber-700 text-xs">직원 수·업종·지역이 바뀌면 저장 후 자동으로 재판정이 실행됩니다.</p>
          </div>
        )}
      </div>

      {/* ── 알림 설정 ── */}
      <div className="bg-white border border-[#E4E6EA] rounded-2xl shadow-sm">
        <div className="px-5 py-4 border-b border-[#E4E6EA]">
          <h2 className="text-[#111111] font-semibold text-sm">알림 설정</h2>
        </div>

        {/* 채널 */}
        <div className="px-5 py-4 border-b border-[#F5F6F8]">
          <p className="text-[#888888] text-[11px] font-medium mb-3">수신 채널</p>
          <div className="flex gap-3">
            {(["email", "push"] as const).map(ch => (
              <button
                key={ch}
                onClick={() => setNotifChannel(p => ({ ...p, [ch]: !p[ch] }))}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all cursor-pointer ${notifChannel[ch] ? "bg-[#6E62C2] text-white border-[#6E62C2] shadow-md shadow-[#6E62C2]/20" : "bg-[#F5F6F8] text-[#888888] border-[#E4E6EA] hover:border-[#6E62C2]/30"}`}
              >
                <span>{ch === "email" ? "✉" : "🔔"}</span>
                {ch === "email" ? "이메일" : "앱 푸시"}
              </button>
            ))}
          </div>
        </div>

        {/* 항목별 토글 */}
        <div className="px-5 py-2 divide-y divide-[#F5F6F8]">
          {notifItems.map(item => (
            <div key={item.key} className="flex items-center gap-4 py-3">
              <div className="flex-1">
                <p className="text-[#111111] text-sm font-medium">{item.label}</p>
                <p className="text-[#888888] text-xs mt-0.5">{item.desc}</p>
              </div>
              <button
                onClick={() => setNotifs(p => ({ ...p, [item.key]: !p[item.key] }))}
                className={`w-10 h-6 rounded-full transition-all cursor-pointer relative shrink-0 ${notifs[item.key] ? "bg-[#6E62C2]" : "bg-[#D0D3DA]"}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${notifs[item.key] ? "left-5" : "left-1"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── 판정 이력 ── */}
      <div className="bg-white border border-[#E4E6EA] rounded-2xl shadow-sm">
        <div className="px-5 py-4 border-b border-[#E4E6EA] flex items-center justify-between">
          <h2 className="text-[#111111] font-semibold text-sm">판정 이력</h2>
          <button className="text-xs font-semibold text-[#6E62C2] bg-[#f0eef9] border border-[#dddaf4] px-3 py-1.5 rounded-xl hover:bg-[#dddaf4] transition-colors cursor-pointer">엑셀 내보내기</button>
        </div>
        <div className="divide-y divide-[#F5F6F8]">
          {historyRows.map((row, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <span className="text-[#888888] text-xs font-mono shrink-0 w-20">{row.date}</span>
              <div className="flex-1">
                <p className="text-[#111111] text-sm font-medium">{row.event}</p>
                <p className="text-[#888888] text-xs mt-0.5">{row.result}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 계정 관리 ── */}
      <div className="bg-white border border-[#E4E6EA] rounded-2xl shadow-sm">
        <div className="px-5 py-4 border-b border-[#E4E6EA]">
          <h2 className="text-[#111111] font-semibold text-sm">계정 관리</h2>
        </div>
        <div className="px-5 py-3 space-y-1">
          {["비밀번호 변경", "이메일 주소 변경", "로그아웃"].map(label => (
            <button key={label} className={`w-full text-left text-sm px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${label === "로그아웃" ? "text-rose-600 hover:bg-rose-50" : "text-[#444444] hover:bg-[#F5F6F8]"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────

export default function BridgePage() {
  const [page, setPage] = useState<Page>("dashboard");
  const [company, setCompany] = useState<Company>(DEFAULT_COMPANY);
  const [taskList, setTaskList] = useState<Task[]>(tasks);

  return (
    <div className="size-full flex bg-white font-sans overflow-hidden">
      <Sidebar page={page} setPage={setPage} company={company} />
      <main className={`flex-1 bg-white ${page === "calendar" ? "overflow-hidden" : "overflow-y-auto"}`}>
        {page === "dashboard"      && <Dashboard setPage={setPage} company={company} />}
        {page === "announcements"  && <AnnouncementsPage />}
        {page === "grants"         && <GrantsPage />}
        {page === "tasks"          && <TasksPage taskList={taskList} setTaskList={setTaskList} />}
        {page === "calendar"       && <CalendarPage taskList={taskList} setTaskList={setTaskList} />}
        {page === "expiring"       && <ExpiringPage />}
        {page === "simulator"      && <SimulatorPage company={company} />}
        {page === "mypage"         && <MyPage company={company} onSave={setCompany} />}
      </main>
    </div>
  );
}
