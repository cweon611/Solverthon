"use client";

// design/BizBuddyPage.tsx 1321–1464행 AnnouncementsPage + 라벨/색 맵.
// 정렬 §4.5-7 · 마감 카드 테두리 항상 포함 §4.5-19 · fieldColors "기타" §4.5-20 · 원문 보기 외부 링크 §4.5-8.

import Link from "next/link";
import { useState } from "react";

import { useAnnouncements } from "@/lib/store/hooks";
import type { Announcement, AnnouncementField, AnnouncementStatus, GrantStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { chip, segmented } from "@/components/ui/button-variants";
import { Card, cardTitleClass } from "@/components/ui/card";
import { ExtLink } from "@/components/ui/ExtLink";
import { Input } from "@/components/ui/input";
import { annStatusBadge, cardMutedVariants, separatorVerticalClass } from "@/components/ui/variants";

const annStatusLabel: Record<AnnouncementStatus, string> = { open: "접수중", closing: "마감임박", closed: "마감" };
const fieldColors: Record<AnnouncementField | "전체", string> = {
  "전체": "",
  "창업": "bg-violet-50 text-violet-700 border-violet-200",
  "R&D":  "bg-blue-50 text-blue-700 border-blue-200",
  "수출": "bg-sky-50 text-sky-700 border-sky-200",
  "고용": "bg-teal-50 text-teal-700 border-teal-200",
  "금융": "bg-orange-50 text-orange-700 border-orange-200",
  "기타": "bg-[#F5F6F8] text-[#444444] border-[#E4E6EA]",
};

type SortKey = "deadline" | "eligible" | "latest";

const sortLabels: Record<SortKey, string> = {
  deadline: "마감임박순",
  eligible: "적합도순",
  latest:   "최신순",
};

const verdictOrder: Record<GrantStatus, number> = { pass: 0, conditional: 1, fail: 2 };

// apply_end 오름차순, 상시(null)는 뒤
const byEnd = (a: Announcement, b: Announcement) => {
  if (a.sortEnd === b.sortEnd) return 0;
  if (a.sortEnd === null) return 1;
  if (b.sortEnd === null) return -1;
  return a.sortEnd < b.sortEnd ? -1 : 1;
};

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");

export function AnnouncementsScreen() {
  const allAnnouncements = useAnnouncements();
  const [statusFilter, setStatusFilter] = useState<AnnouncementStatus | "all">("all");
  const [fieldFilter, setFieldFilter]   = useState<AnnouncementField | "전체">("전체");
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("deadline");

  const fields: (AnnouncementField | "전체")[] = ["전체", "창업", "R&D", "수출", "고용", "금융", "기타"];
  const q = norm(search);

  const filtered = allAnnouncements
    .filter(a => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (fieldFilter !== "전체" && a.field !== fieldFilter) return false;
      if (eligibleOnly && !a.eligible) return false;
      if (q && !norm(a.title).includes(q) && !norm(a.agency).includes(q)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "deadline") return byEnd(a, b);
      if (sort === "eligible") return (verdictOrder[a.verdict] - verdictOrder[b.verdict]) || byEnd(a, b);
      return b.createdAt.localeCompare(a.createdAt); // latest: created_at 내림차순
    });

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold text-[#111111]">공고 목록</h1>
        <p className="text-[#888888] text-sm mt-1">수집된 지원사업 공고 전체입니다. 필터로 범위를 좁혀 보세요.</p>
      </div>

      {/* 검색 + 필터 */}
      <div className="space-y-3">
        <Input
          variant="flowLg"
          type="text"
          placeholder="공고명·기관명 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex items-center gap-2 flex-wrap">
          {/* 정렬 */}
          <div className="flex gap-1 bg-[#F5F6F8] border border-[#E4E6EA] rounded-xl p-1">
            {(["deadline", "eligible", "latest"] as SortKey[]).map(s => (
              <button key={s} onClick={() => setSort(s)}
                className={segmented({ on: sort === s, size: "sm" })}>
                {sortLabels[s]}
              </button>
            ))}
          </div>
          <div className={separatorVerticalClass} />
          {/* 상태 필터 */}
          {(["all", "open", "closing", "closed"] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={chip({ on: statusFilter === s, elevate: "sm" })}>
              {s === "all" ? "전체 상태" : annStatusLabel[s]}
            </button>
          ))}
          <div className={separatorVerticalClass} />
          {/* 분야 필터 */}
          {fields.filter(f => f !== "전체").map(f => (
            <button key={f} onClick={() => setFieldFilter(fieldFilter === f ? "전체" : f)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${fieldFilter === f ? "bg-[#6E62C2] text-white border-[#6E62C2] shadow-sm" : `bg-white ${fieldColors[f]} hover:opacity-80`}`}>
              {f}
            </button>
          ))}
          <div className={separatorVerticalClass} />
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
          <div className={cardMutedVariants({ pad: "p10", center: true })}>
            <p className="text-[#888888] text-sm">조건에 맞는 공고가 없습니다.</p>
          </div>
        ) : filtered.map(ann => (
          <Card key={ann.id} className={cn("px-5 py-4 flex items-center gap-4 hover:border-[#6E62C2]/30 transition-all", ann.status === "closed" && "opacity-60")}>
            {/* 상태 뱃지 */}
            <Badge size="lg" weight="semibold" tone={annStatusBadge[ann.status]} fixed="shrink0">
              {annStatusLabel[ann.status]}
            </Badge>

            {/* 본문 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={cardTitleClass}>{ann.title}</p>
                {ann.eligible && (
                  <Badge size="sm" weight="semibold" tone="success">대상</Badge>
                )}
                {ann.isSynthetic && (
                  <Badge size="sm" weight="none" tone="muted">시연용</Badge>
                )}
                {ann.dualListed && (
                  <Badge size="sm" weight="none" tone="brand">기업마당·K-Startup 동시 게시</Badge>
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
              <ExtLink href={ann.originalUrl} className="inline-block text-[11px] text-[#888888] hover:text-[#6E62C2] transition-colors cursor-pointer">
                {ann.isSynthetic ? "포털에서 찾기 →" : "원문 보기 →"}
              </ExtLink>
              {ann.status !== "closed" && (
                <Link href={`/grants/${ann.id}/draft`} className="block text-[11px] text-[#6E62C2] hover:underline">✦ 신청서 초안 →</Link>
              )}
              {ann.attachmentUrl && (
                <ExtLink href={ann.attachmentUrl} className="block text-[11px] text-[#888888] hover:text-[#6E62C2] transition-colors cursor-pointer">첨부파일 →</ExtLink>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
