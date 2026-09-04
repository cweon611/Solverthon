"use client";

// design/BridgePage.tsx 645행 EMPTY_DRAFT · 681–735행 FormRow·TaskForm을 모듈 최상위로 호이스팅(§4.5-2).
// 렌더마다 새 컴포넌트 타입이 생겨 입력마다 리마운트되던 포커스 손실 버그 수정.

import type { ReactNode } from "react";

import { addDays, fmtDate } from "@/lib/engine/format";
import { useToday } from "@/lib/store/today";
import type { TaskDraft } from "@/lib/types";

export const EMPTY_DRAFT: TaskDraft = { title: "", type: "date", dueDate: "", authority: "", penalty: "" };

// TaskForm 전용 (MiniForm은 w-full · text-xs로 다르므로 별도 상수 — §4.5-2)
const inputCls = "flex-1 border border-[#E4E6EA] rounded-lg px-3 py-1.5 text-sm text-[#111111] focus:outline-none focus:border-[#6E62C2] focus:ring-1 focus:ring-[#6E62C2]/20";
const selectCls = "border border-[#E4E6EA] rounded-lg px-3 py-1.5 text-sm text-[#111111] focus:outline-none focus:border-[#6E62C2] bg-white cursor-pointer";

export function FormRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[#888888] text-xs w-14 shrink-0">{label}</span>
      {children}
    </div>
  );
}

export function TaskForm({
  draft, setDraft, onSave, onCancel, saveLabel,
}: {
  draft: TaskDraft;
  setDraft: (d: TaskDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
}) {
  const today = useToday();
  return (
    <div className="bg-[#f0eef9] border border-[#6E62C2]/25 rounded-2xl px-5 py-4 space-y-3">
      <FormRow label="제목">
        <input className={inputCls} placeholder="할 일 제목" value={draft.title}
          onChange={e => setDraft({ ...draft, title: e.target.value })} />
      </FormRow>
      <FormRow label="유형">
        <select className={selectCls} value={draft.type}
          onChange={e => setDraft({ ...draft, type: e.target.value as TaskDraft["type"] })}>
          <option value="date">날짜형</option>
          <option value="event">이벤트형</option>
        </select>
      </FormRow>
      <FormRow label="기한">
        <input className={inputCls} placeholder={`예: ${fmtDate(addDays(today, 30))} 또는 채용 즉시`} value={draft.dueDate}
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
}
