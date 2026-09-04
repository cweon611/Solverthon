"use client";

// design/BridgePage.tsx 645–824행 TasksPage. FormRow·TaskForm은 components/ui/TaskForm.tsx로 호이스팅(§4.5-2).
// 상태는 공유 useTasks()(§4.5-4). id는 문자열(§4.5-18).

import { useState } from "react";

import { PHOTOS } from "@/lib/constants";
import { useTasks } from "@/lib/store/hooks";
import type { Task, TaskDraft } from "@/lib/types";

import { Disclaimer } from "@/components/ui/Disclaimer";
import { Img } from "@/components/ui/Img";
import { EMPTY_DRAFT, TaskForm } from "@/components/ui/TaskForm";

export function TasksScreen() {
  const { tasks: taskList, toggle, add, update, remove } = useTasks();
  const [typeFilter, setTypeFilter] = useState<"all" | "date" | "event">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<TaskDraft>(EMPTY_DRAFT);
  const [showAdd, setShowAdd] = useState(false);
  const [addDraft, setAddDraft] = useState<TaskDraft>(EMPTY_DRAFT);

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditDraft({ title: task.title, type: task.type, dueDate: task.dueDate, authority: task.authority, penalty: task.penalty });
    setShowAdd(false);
  };

  const saveEdit = () => {
    if (editingId !== null) update(editingId, editDraft);
    setEditingId(null);
  };

  const saveAdd = () => {
    if (!addDraft.title.trim()) return;
    add(addDraft);
    setAddDraft(EMPTY_DRAFT);
    setShowAdd(false);
  };

  const filtered = typeFilter === "all" ? taskList : taskList.filter(t => t.type === typeFilter);

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
                    {/* 지난 기한·미완료 → rose (§6.3 허용된 최소 추가) */}
                    <span className={`font-mono ${task.overdue && !task.done ? "text-rose-600" : ""}`}>{task.dueDate}</span>
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
                    <button onClick={() => remove(task.id)}
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
    <Disclaimer />
    </div>
  );
}
