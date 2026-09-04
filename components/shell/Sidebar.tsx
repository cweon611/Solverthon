"use client";

// design/BridgePage.tsx 206–278행 Sidebar.
// page/setPage → usePathname() + <Link>(§4.2). 배지는 훅에서 계산. 푸터 문구 §4.5-3 + /about 링크(허용된 추가).

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { EXPIRY_AMBER, PHOTOS } from "@/lib/constants";
import { fmtBusinessAge, fmtDate, isoToDot } from "@/lib/engine/format";
import { useCatalog, useCompany, useExpiring, useTasks, useToday, useVerdicts } from "@/lib/store/hooks";

import { Img } from "@/components/ui/Img";

import { CalendarIcon, ChartIcon, CheckCircleIcon, ClockIcon, GridIcon, LayersIcon, ListIcon, MegaphoneIcon, PersonIcon, SparklesIcon, UsersIcon } from "./Icons";

export function Sidebar() {
  const pathname = usePathname();
  const today = useToday();
  const company = useCompany();
  const { meta, programCount } = useCatalog();
  const grants = useVerdicts();
  const { tasks } = useTasks();
  const expiring = useExpiring();

  type NavItem = { href: string; label: string; icon: ReactNode; badge?: number };
  // "AI 데모" 그룹은 시뮬레이터 뒤, 마이페이지 앞에 둔다 (§4.3)
  const groups: { heading?: string; items: NavItem[] }[] = [
    {
      items: [
        { href: "/dashboard",      label: "대시보드",        icon: <GridIcon /> },
        { href: "/announcements",  label: "공고 목록",        icon: <MegaphoneIcon />, badge: programCount },
        { href: "/grants",         label: "지원사업 판정함",  icon: <CheckCircleIcon />, badge: grants.filter(g => g.status === "pass").length },
        { href: "/tasks",          label: "오늘 할 일",       icon: <ListIcon />, badge: tasks.filter(t => !t.done).length },
        { href: "/expiring",       label: "곧 사라짐",        icon: <ClockIcon />, badge: expiring.filter(e => e.expiresIn !== null && e.expiresIn <= EXPIRY_AMBER).length },
        { href: "/calendar",       label: "캘린더",           icon: <CalendarIcon /> },
        { href: "/simulator",      label: "직원 시뮬레이터",  icon: <UsersIcon /> },
        { href: "/cashflow",       label: "현금흐름 분석",    icon: <ChartIcon /> },
      ],
    },
    {
      heading: "AI 데모",
      items: [
        { href: "/demo/parse",  label: "공고 AI 파싱",   icon: <SparklesIcon /> },
        { href: "/demo/dedupe", label: "중복 공고 판별", icon: <LayersIcon /> },
      ],
    },
    {
      items: [{ href: "/mypage", label: "마이페이지", icon: <PersonIcon /> }],
    },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  // seed 모드: "시드 데이터 기준 YYYY.MM.DD" · supabase 모드: 마지막 동기화 시각
  const syncText = meta.mode === "seed"
    ? `시드 데이터 기준 ${fmtDate(today)}`
    : meta.syncedAt ? `공고 동기화 ${isoToDot(meta.syncedAt.slice(0, 10))}` : "공고 동기화 기록 없음";

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-[#E4E6EA] flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#E4E6EA]">
        <div className="flex items-center gap-2.5">
          <Image src="/brand/logo.png" alt="비즈버디" width={176} height={56} priority className="h-9 w-auto" />
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
              <span className="text-[9px] text-[#6E62C2] bg-[#f0eef9] px-1.5 py-0.5 rounded-full font-semibold">업력 {fmtBusinessAge(company.ageMonths)}</span>
              <span className="text-[9px] text-[#444444] bg-white border border-[#E4E6EA] px-1.5 py-0.5 rounded-full">직원 {company.employees}인</span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {groups.map((group, gi) => (
          <div key={group.heading ?? gi} className="space-y-0.5">
            {group.heading && (
              <p className="text-[10px] font-semibold text-[#888888] uppercase tracking-wide px-3 pt-3 pb-1">{group.heading}</p>
            )}
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer text-left group ${
                    active
                      ? "bg-[#6E62C2] text-white shadow-md shadow-[#6E62C2]/25 font-semibold"
                      : "text-[#444444] hover:bg-[#F5F6F8] hover:text-[#111111]"
                  }`}
                >
                  <span className={`w-4 h-4 shrink-0 ${active ? "opacity-100" : "opacity-60 group-hover:opacity-80"}`}>{item.icon}</span>
                  <span className="flex-1 text-[13px]">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-semibold ${active ? "bg-white/20 text-white" : "bg-[#E4E6EA] text-[#444444]"}`}>{item.badge}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer micro info */}
      <div className="px-4 py-4 border-t border-[#E4E6EA]">
        <p className="text-[10px] text-[#888888] leading-relaxed">
          판정 기준일 {fmtDate(today)}<br />
          {syncText}<br />
          <Link href="/about" className="hover:text-[#6E62C2] hover:underline">데이터 출처·면책</Link>
        </p>
      </div>
    </aside>
  );
}
