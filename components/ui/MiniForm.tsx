"use client";

// design/BridgePage.tsx 892–915행 MiniForm(CalendarPage 내부)을 모듈 최상위로 호이스팅(§4.5-2).

import { addDays, fmtDate } from "@/lib/engine/format";
import { useToday } from "@/lib/store/today";
import type { TaskDraft } from "@/lib/types";

// MiniForm 전용 (TaskForm은 flex-1 · text-sm — §4.5-2)
const inputCls = "w-full border border-[#E4E6EA] rounded-lg px-3 py-1.5 text-xs text-[#111111] focus:outline-none focus:border-[#6E62C2] focus:ring-1 focus:ring-[#6E62C2]/20";
const selectCls = "w-full border border-[#E4E6EA] rounded-lg px-3 py-1.5 text-xs text-[#111111] focus:outline-none focus:border-[#6E62C2] bg-white cursor-pointer";

export function MiniForm({ draft, setDraft, onSave, onCancel, label }: {
  draft: TaskDraft; setDraft: (d: TaskDraft) => void;
  onSave: () => void; onCancel: () => void; label: string;
}) {
  const today = useToday();
  return (
    <div className="bg-[#f0eef9] border border-[#6E62C2]/25 rounded-xl p-3 space-y-2 mt-2">
      <input className={inputCls} placeholder="제목" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <select className={selectCls} value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value as TaskDraft["type"] })}>
          <option value="date">날짜형</option>
          <option value="event">이벤트형</option>
        </select>
        <input className={inputCls} placeholder={`기한 (${fmtDate(addDays(today, 30))})`} value={draft.dueDate} onChange={e => setDraft({ ...draft, dueDate: e.target.value })} />
      </div>
      <input className={inputCls} placeholder="소관기관" value={draft.authority} onChange={e => setDraft({ ...draft, authority: e.target.value })} />
      <input className={inputCls} placeholder="미이행 시 페널티" value={draft.penalty} onChange={e => setDraft({ ...draft, penalty: e.target.value })} />
      <div className="flex gap-2">
        <button onClick={onSave} className="px-3 py-1 rounded-lg bg-[#6E62C2] text-white text-[11px] font-semibold hover:bg-[#5a50a8] cursor-pointer">{label}</button>
        <button onClick={onCancel} className="px-3 py-1 rounded-lg border border-[#E4E6EA] text-[#444444] text-[11px] font-semibold hover:bg-[#F5F6F8] cursor-pointer">취소</button>
      </div>
    </div>
  );
}
