"use client";

// design/BizBuddyPage.tsx 282–395행 Dashboard. 배너·숫자·목록 전부 훅(엔진 결과)에서 공급(§4.2).

import Link from "next/link";

import { EXPIRY_AMBER, EXPIRY_ROSE } from "@/lib/constants";
import { fmtDate } from "@/lib/engine/format";
import { useCompany, useExpiring, useTasks, useToday, useTopAlert, useVerdicts } from "@/lib/store/hooks";
import { cn } from "@/lib/utils";

import { Disclaimer } from "@/components/ui/Disclaimer";
import { Alert } from "@/components/ui/alert";
import { button } from "@/components/ui/button-variants";
import { cardMutedVariants, cardTitleClass, cardVariants } from "@/components/ui/variants";

// 섹션 "전체 →"와 숫자 카드는 <Link>다(asChild 없음) — 클래스만 표에서 만든다.
const SECTION_LINK = button({ variant: "linkBrand", text: "xs" });
const NUMBER_CARD = cn(
  cardVariants({ pad: "p5", shadow: "none" }),
  "text-left hover:border-[#D0D3DA] hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer group",
);

export function DashboardScreen() {
  const today = useToday();
  const company = useCompany();
  const grants = useVerdicts();
  const { tasks } = useTasks();
  const expiringItems = useExpiring();
  const alert = useTopAlert();

  const passCount = grants.filter(g => g.status === "pass").length;
  const pendingTasks = tasks.filter(t => !t.done);
  const urgentExpiring = expiringItems.filter(e => e.expiresIn !== null && e.expiresIn <= EXPIRY_AMBER);

  return (
    <div className="p-6 space-y-5">

      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#111111]">안녕하세요, {company.name.replace("주식회사", "").trim()} 👋</h1>
          <p className="text-[#888888] text-sm mt-1">{fmtDate(today)} 기준 자동 판정 결과입니다.</p>
        </div>
        <Alert tone="success" radius="2xl" pad="sm" className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#3D7260] animate-pulse" />
          <span className="text-[#2A5A46] text-xs font-semibold">판정 완료</span>
        </Alert>
      </div>

      {/* ── 알림 배너 (pickTopAlert 1건, 없으면 미표시 — §4.5-5) ── */}
      {/* 오렌지는 tone 표에 없다 — 색만 className으로 넘긴다 */}
      {alert && (
        <Alert tone={null} radius="2xl" pad="xl" className="flex items-start gap-3 bg-[#fff8f0] border-orange-200">
          <span className="text-orange-500 text-lg mt-0.5">⚠</span>
          <div className="flex-1">
            <p className="text-[#111111] text-sm font-semibold">{alert.title}</p>
            <p className="text-[#888888] text-xs mt-0.5">{alert.subtitle}</p>
          </div>
          <Link href={alert.href} className="text-xs font-semibold text-orange-600 hover:text-orange-800 shrink-0 cursor-pointer">자세히 →</Link>
        </Alert>
      )}

      {/* ── 요약 숫자 카드 3개 ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "받을 수 있음",   value: passCount,            unit: "건", accent: "#2D6A4F", href: "/grants" },
          { label: "미완료 할 일",   value: pendingTasks.length,  unit: "건", accent: "#4A4A6A", href: "/tasks" },
          { label: "곧 소멸 (3개월)", value: urgentExpiring.length, unit: "건", accent: "#7A4040", href: "/expiring" },
        ].map((c) => (
          <Link key={c.label} href={c.href} className={NUMBER_CARD}>
            <p className="text-[#888888] text-[11px] font-medium mb-3">{c.label}</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-display font-bold text-[#111111]">{c.value}</span>
              <span className="text-[#888888] text-sm">{c.unit}</span>
            </div>
            <div className="mt-3 h-0.5 rounded-full w-8 transition-all group-hover:w-12" style={{ backgroundColor: c.accent }} />
          </Link>
        ))}
      </div>

      {/* ── 받을 수 있는 지원사업 ── */}
      <div className={cardMutedVariants()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={cardTitleClass}>받을 수 있는 지원사업</h2>
          <Link href="/grants" className={SECTION_LINK}>전체 →</Link>
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
        <div className={cardMutedVariants()}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={cardTitleClass}>곧 사라질 자격</h2>
            <Link href="/expiring" className={SECTION_LINK}>전체 →</Link>
          </div>
          <div className="space-y-2">
            {expiringItems.slice(0, 3).map(item => {
              const urgent = item.expiresIn !== null && item.expiresIn <= EXPIRY_ROSE;
              const soon = item.expiresIn !== null && item.expiresIn <= EXPIRY_AMBER;
              return (
                <div key={item.id} className={`bg-white rounded-xl px-4 py-3 flex items-center gap-3 border shadow-sm ${urgent ? "border-rose-200" : soon ? "border-amber-200" : "border-[#E4E6EA]"}`}>
                  <span className={`text-xs font-mono font-bold shrink-0 w-10 text-center ${urgent ? "text-rose-600" : soon ? "text-amber-600" : "text-[#888888]"}`}>
                    {item.expiresIn === null ? "채용 시" : `D-${item.expiresIn}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#111111] text-xs font-semibold truncate">{item.grantName}</p>
                    <p className="text-[#888888] text-[10px] mt-0.5">{item.axis}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 오늘 할 일 */}
        <div className={cardMutedVariants()}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={cardTitleClass}>오늘 할 일</h2>
            <Link href="/tasks" className={SECTION_LINK}>전체 →</Link>
          </div>
          <div className="space-y-2">
            {pendingTasks.slice(0, 3).map(t => (
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
    <Disclaimer />
    </div>
  );
}
