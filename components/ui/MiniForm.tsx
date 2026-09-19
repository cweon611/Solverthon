"use client";

// design/BizBuddyPage.tsx 892–915행 MiniForm(CalendarPage 내부)을 모듈 최상위로 호이스팅(§4.5-2).

import { addDays, fmtDate } from "@/lib/engine/format";
import { useToday } from "@/lib/store/today";
import type { TaskDraft } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// 컨트롤은 miniXs 계열이다 (TaskForm은 flex-1 · text-sm rowSm — §4.5-2)
export function MiniForm({ draft, setDraft, onSave, onCancel, label }: {
  draft: TaskDraft; setDraft: (d: TaskDraft) => void;
  onSave: () => void; onCancel: () => void; label: string;
}) {
  const today = useToday();
  return (
    <div className="bg-[#f0eef9] border border-[#6E62C2]/25 rounded-xl p-3 space-y-2 mt-2">
      <Input variant="miniXs" placeholder="제목" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        {/* 트리거 상자는 옛 네이티브 select와 같은 miniXs 계열 — 격자 한 칸을 그대로 채운다 */}
        <Select value={draft.type} onValueChange={v => setDraft({ ...draft, type: v as TaskDraft["type"] })}>
          <SelectTrigger variant="miniXs" aria-label="할 일 유형"><SelectValue /></SelectTrigger>
          <SelectContent text="xs">
            <SelectItem value="date">날짜형</SelectItem>
            <SelectItem value="event">이벤트형</SelectItem>
          </SelectContent>
        </Select>
        <Input variant="miniXs" placeholder={`기한 (${fmtDate(addDays(today, 30))})`} value={draft.dueDate} onChange={e => setDraft({ ...draft, dueDate: e.target.value })} />
      </div>
      <Input variant="miniXs" placeholder="소관기관" value={draft.authority} onChange={e => setDraft({ ...draft, authority: e.target.value })} />
      <Input variant="miniXs" placeholder="미이행 시 페널티" value={draft.penalty} onChange={e => setDraft({ ...draft, penalty: e.target.value })} />
      <div className="flex gap-2">
        <Button onClick={onSave} variant="primary" pad="3x1" text="11" radius="lg">{label}</Button>
        <Button onClick={onCancel} variant="outline" pad="3x1" text="11" radius="lg">취소</Button>
      </div>
    </div>
  );
}
