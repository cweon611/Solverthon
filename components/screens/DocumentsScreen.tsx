"use client";

// S9 준비서류 리드타임 역산 (§8 S9)
// 마감일에서 발급 소요기간을 빼 "언제까지 신청을 시작해야 하는가"를 보여준다.
// 소요기간은 사람이 확인한 document_types에서만 온다. AI 추정값은 쓰지 않는다 (§6.5).

import Link from "next/link";
import { useMemo, useState } from "react";

import { dDay, fmtDate, fromIso, isoToDot } from "@/lib/engine/format";
import { computeLeadTime, type LeadTimeStatus } from "@/lib/engine/leadTime";
import { resolveOriginalUrl } from "@/lib/sourceLinks";
import { useCatalog, useToday } from "@/lib/store/hooks";
import { cn } from "@/lib/utils";

import { Disclaimer } from "@/components/ui/Disclaimer";
import { ExtLink } from "@/components/ui/ExtLink";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { button } from "@/components/ui/button-variants";
import { Card } from "@/components/ui/card";
import { cardMutedVariants, cardTitleClass, leadTimeBadge } from "@/components/ui/variants";

// 색은 badge 표의 leadTimeBadge(= 예전 STATUS.cls)가 갖는다. 여기엔 문구만 남는다.
const STATUS_LABEL: Record<LeadTimeStatus, string> = {
  ok: "여유",
  tight: "서둘러야",
  late: "지금 신청해도 마감 초과",
  unknown: "소요기간 확인 필요",
};

// 뒤로 가기 <Link> 2곳(asChild 없음) — 소스에 손 모양 커서가 없어 hand를 끈다.
const BACK_LINK = button({ variant: "linkBrand", text: "xs", hand: false });

const OVERALL_BANNER = {
  late: { cls: "bg-rose-50 border-rose-200 text-rose-700", text: "이 사업은 서류 준비 기간이 부족합니다. 다음 회차를 준비하세요." },
  tight: { cls: "bg-amber-50 border-amber-200 text-amber-700", text: "오늘 발급 신청을 시작해야 합니다." },
  ok: { cls: "bg-[#EEF4F0] border-[#B2D1BF] text-[#2A5A46]", text: "서류 준비 여유가 있습니다." },
  unknown: { cls: "bg-[#F5F6F8] border-[#E4E6EA] text-[#444444]", text: "일부 서류의 발급 소요기간이 확인되지 않았습니다. 발급처에 문의하세요." },
  rolling: { cls: "bg-[#F5F6F8] border-[#E4E6EA] text-[#444444]", text: "상시 접수 — 서류 준비 후 신청하세요." },
} as const;

export function DocumentsScreen({ programId }: { programId: string }) {
  const today = useToday();
  const { programs, documentTypes } = useCatalog();
  const [openSource, setOpenSource] = useState(false);

  const program = programs.find((p) => p.id === programId);
  const plan = useMemo(
    () => (program ? computeLeadTime(program, documentTypes, today) : null),
    [program, documentTypes, today],
  );

  if (!program || !plan) {
    return (
      <div className="p-6 space-y-5">
        <Link href="/grants" className={BACK_LINK}>← 판정함</Link>
        <div className={cardMutedVariants({ pad: "p10", center: true })}>
          <p className="text-[#888888] text-sm">해당 공고를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const end = program.apply_end ? fromIso(program.apply_end) : null;
  const days = end ? dDay(end, today) : null;
  const banner = OVERALL_BANNER[plan.overall];

  return (
    <div className="p-6 space-y-5">
      {/* 헤더 */}
      <div>
        <Link href="/grants" className={BACK_LINK}>← 판정함</Link>
        <div className="flex items-start justify-between gap-4 mt-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-display font-bold text-[#111111]">{program.title}</h1>
            <p className="text-[#888888] text-sm mt-1">{program.organization}</p>
          </div>
          <Badge size="due" weight="monoSemibold" fixed="shrink0"
            tone={plan.isRolling ? "muted" : days !== null && days <= 7 ? "danger" : "brand"}>
            {plan.isRolling ? "상시 접수" : `마감 ${end ? fmtDate(end) : "-"} · D-${days}`}
          </Badge>
        </div>
      </div>

      {/* 종합 배너 */}
      {/* 지역 맵이 본문 색까지 들고 있어 tone은 비우고 색을 className으로 넘긴다 */}
      <Alert tone={null} radius="2xl" pad="x2" className={`flex items-center gap-3 ${banner.cls}`}>
        <p className="text-sm font-semibold flex-1">{banner.text}</p>
        {plan.overall === "late" && (
          <ExtLink href={resolveOriginalUrl(program)}
            className={cn(button({ variant: "softOnWhite", pad: "3x1.5", text: "xs", radius: "xl", motion: "colors", hand: false }), "shrink-0")}>
            공고 원문
          </ExtLink>
        )}
      </Alert>

      {/* 서류 표 */}
      {plan.items.length === 0 ? (
        <div className={cardMutedVariants({ pad: "p8", center: true })}>
          <p className="text-[#888888] text-sm">이 공고에는 등록된 제출 서류가 없습니다.</p>
        </div>
      ) : (
        <Card clip>
          <div className="grid grid-cols-[2fr_1.5fr_0.8fr_1fr_1.2fr] bg-[#F5F6F8] px-5 py-2.5 text-[10px] font-semibold text-[#888888] uppercase tracking-wide">
            <span>서류</span><span>발급처</span><span>발급 소요</span><span>최종 착수일</span><span>상태</span>
          </div>
          {plan.items.map((item, i) => (
            <div key={`${item.name}-${i}`} className={`grid grid-cols-[2fr_1.5fr_0.8fr_1fr_1.2fr] px-5 py-3.5 items-center border-t border-[#E4E6EA] ${i % 2 === 0 ? "bg-white" : "bg-[#F5F6F8]/40"}`}>
              <span className="text-[#111111] text-xs font-medium">{item.name}</span>
              <span className="text-[#888888] text-xs">
                {item.issueUrl ? (
                  <a href={item.issueUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[#6E62C2] hover:underline">{item.issuer ?? "-"}</a>
                ) : (item.issuer ?? "-")}
              </span>
              <span className="text-[#444444] text-xs font-mono">
                {item.leadTimeDays === null ? "확인 필요" : item.leadTimeDays === 0 ? "즉시" : `${item.leadTimeDays}일`}
              </span>
              <span className="text-[#444444] text-xs font-mono">{item.latestStart ? isoToDot(item.latestStart) : "-"}</span>
              <Badge size="cell" weight="semibold" tone={leadTimeBadge[item.status]}>
                {STATUS_LABEL[item.status]}
              </Badge>
            </div>
          ))}
        </Card>
      )}

      {/* 원문 근거 */}
      {plan.items.length > 0 && (
        <Card clip>
          <Button variant="rowDisclosure" pad="5x3.5" block motion="colors" className="flex items-center justify-between"
            onClick={() => setOpenSource((v) => !v)}>
            <span className={cardTitleClass}>공고 원문 근거</span>
            <span className={`text-[#888888] text-xs transition-transform ${openSource ? "rotate-180" : ""}`}>▾</span>
          </Button>
          {openSource && (
            <div className="px-5 pb-4 space-y-2 border-t border-[#E4E6EA] pt-3">
              {(program.required_documents ?? []).map((d, i) => (
                <div key={i}>
                  <p className="text-[#111111] text-xs font-medium">{d.name}{!d.is_required && <span className="text-[#888888] ml-1">(선택)</span>}</p>
                  <p className="text-[11px] text-[#888888] bg-[#F5F6F8] rounded-lg px-3 py-2 italic mt-1">{d.source_text}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <p className="text-[10px] text-[#888888]">
        발급 소요기간은 서류 카탈로그에 사람이 확인해 기록한 값입니다. 기관 사정에 따라 달라질 수 있으니 발급처에 확인하세요.
      </p>

      <Disclaimer />
    </div>
  );
}
