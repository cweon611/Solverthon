"use client";

// 판정표 — 요건 항목 · 기준 조건 · 우리 회사. 행을 누르면 근거(공고 원문 + 상위 규범)가 펼쳐진다.
// 대상 카드(초록)와 조건부·제외 목록(중립)이 같은 표를 쓴다.

import Link from "next/link";
import { useState } from "react";

import type { ConditionBasis, EligibilityCriteria } from "@/lib/types";

import { Button } from "@/components/ui/button";

const BASIS_KIND: Record<ConditionBasis["kind"], string> = { law: "법령", rule: "운영 기준", notice: "공고 규정" };

const STATE_MARK = {
  pass: { mark: "✓", dot: "bg-[#3D7260] text-white", text: "text-[#2A5A46]" },
  fail: { mark: "✕", dot: "bg-rose-400 text-white", text: "text-rose-600" },
  check: { mark: "?", dot: "bg-amber-400 text-white", text: "text-amber-700" },
} as const;

const TONE = {
  pass: { wrap: "border-[#B2D1BF]", head: "bg-[#D8EAE0]/60 text-[#2A5A46]", row: "border-[#D8EAE0]", zebra: "bg-[#EEF4F0]/30", hover: "hover:bg-[#D8EAE0]/30" },
  neutral: { wrap: "border-[#E4E6EA]", head: "bg-[#F5F6F8] text-[#888888]", row: "border-[#E4E6EA]", zebra: "bg-[#FAFAFB]", hover: "hover:bg-[#F5F6F8]" },
} as const;

export function BasisLine({ basis }: { basis: ConditionBasis }) {
  return (
    <p className="text-[11px] text-[#444444] leading-relaxed">
      <span className="font-semibold text-[#6E62C2]">{BASIS_KIND[basis.kind]}</span>{" "}
      <span className="font-medium">{basis.ref}</span>
      {basis.note && <span className="text-[#888888]"> — {basis.note}</span>}
      {basis.checked_at === null && <span className="ml-1 text-amber-700">(원문 대조 전)</span>}
    </p>
  );
}

export function CriteriaTable({ rows, tone = "neutral", rowKey }: { rows: EligibilityCriteria[]; tone?: keyof typeof TONE; rowKey: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const t = TONE[tone];
  return (
    <div className={`border rounded-xl overflow-hidden ${t.wrap}`}>
      <div className={`grid grid-cols-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide ${t.head}`}>
        <span>요건 항목</span>
        <span>기준 조건</span>
        <span>우리 회사</span>
      </div>
      {rows.map((item, i) => {
        const s = STATE_MARK[item.state];
        const isOpen = open === i;
        return (
          <div key={`${rowKey}:${i}`} className={`border-t ${t.row} ${i % 2 === 0 ? "bg-white" : t.zebra}`}>
            <Button onClick={() => setOpen(isOpen ? null : i)} variant="rowDisclosure" pad="4x3" block motion="colors"
              aria-expanded={isOpen} className={`grid grid-cols-3 items-center ${t.hover}`}>
              <span className="text-[#444444] text-xs font-medium flex items-center gap-1">
                {item.label}
                {item.basis && <span className="text-[9px] font-semibold text-[#6E62C2] bg-[#6E62C2]/10 rounded px-1">{BASIS_KIND[item.basis.kind]}</span>}
              </span>
              <span className="text-[#888888] text-xs">{item.required}</span>
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold shrink-0 ${s.dot}`}>{s.mark}</span>
                <span className={`text-xs font-medium ${s.text}`}>{item.current}</span>
              </div>
            </Button>
            {isOpen && (
              <div className="mx-4 mb-3 space-y-1.5">
                {item.sourceText && (
                  <p className="text-[11px] text-[#888888] bg-[#F5F6F8] rounded-lg px-3 py-2 italic">공고 원문 · {item.sourceText}</p>
                )}
                {item.basis && <div className="px-1"><BasisLine basis={item.basis} /></div>}
                {item.state === "check" && item.missingInput && (
                  <p className="text-[11px] text-amber-700 px-1">
                    ‘{item.missingInput}’ 항목을 입력하면 이 요건이 확정됩니다.{" "}
                    <Link href="/onboarding?edit=1" className="font-semibold underline">프로필 수정 →</Link>
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
