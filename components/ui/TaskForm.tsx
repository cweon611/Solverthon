"use client";

// design/BizBuddyPage.tsx 645행 EMPTY_DRAFT · 681–735행 FormRow·TaskForm을 모듈 최상위로 호이스팅(§4.5-2).
// 렌더마다 새 컴포넌트 타입이 생겨 입력마다 리마운트되던 포커스 손실 버그 수정.

import type { ReactNode } from "react";

import { addDays, fmtDate } from "@/lib/engine/format";
import { useToday } from "@/lib/store/today";
import type { TaskDraft } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const EMPTY_DRAFT: TaskDraft = { title: "", type: "date", dueDate: "", authority: "", penalty: "" };

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
        <Input variant="rowSm" placeholder="할 일 제목" value={draft.title}
          onChange={e => setDraft({ ...draft, title: e.target.value })} />
      </FormRow>
      <FormRow label="유형">
        {/* 옛 네이티브 select는 가장 긴 항목 기준으로 스스로 넓어졌다. 트리거는 고른 값만큼만
            넓어지므로 값이 바뀔 때 상자가 흔들린다 — 가장 긴 항목이 들어가는 너비로 고정한다. */}
        <Select value={draft.type} onValueChange={v => setDraft({ ...draft, type: v as TaskDraft["type"] })}>
          <SelectTrigger variant="rowSm" aria-label="할 일 유형" className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent text="sm">
            <SelectItem value="date">날짜형</SelectItem>
            <SelectItem value="event">이벤트형</SelectItem>
          </SelectContent>
        </Select>
      </FormRow>
      <FormRow label="기한">
        <Input variant="rowSm" placeholder={`예: ${fmtDate(addDays(today, 30))} 또는 채용 즉시`} value={draft.dueDate}
          onChange={e => setDraft({ ...draft, dueDate: e.target.value })} />
      </FormRow>
      <FormRow label="소관기관">
        <Input variant="rowSm" placeholder="예: 국세청" value={draft.authority}
          onChange={e => setDraft({ ...draft, authority: e.target.value })} />
      </FormRow>
      <FormRow label="미이행 시">
        <Input variant="rowSm" placeholder="예: 가산세 20%" value={draft.penalty}
          onChange={e => setDraft({ ...draft, penalty: e.target.value })} />
      </FormRow>
      <div className="flex gap-2 pt-1">
        <Button onClick={onSave}
          variant="primary" pad="4x1.5" text="xs" radius="xl" elevate="sm" motion="colors">
          {saveLabel}
        </Button>
        <Button onClick={onCancel}
          variant="outline" pad="4x1.5" text="xs" radius="xl" motion="colors" className="bg-white">
          취소
        </Button>
      </div>
    </div>
  );
}
