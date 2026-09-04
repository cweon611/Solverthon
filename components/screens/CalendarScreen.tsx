"use client";

// design/BridgePage.tsx 828–1103행 CalendarPage. parseDate/fmtDate/DAYS → lib/engine/format.ts, MiniForm 호이스팅(§4.5-2).
// 날짜 매칭은 dueDateIso(§4.5-16), "중요"는 importance === 'high'(§4.5-17).

import { useState } from "react";

import { DAYS, dotToIso, fromIso, isoToDot, toIso } from "@/lib/engine/format";
import { useCalendarTasks, useTasks, useToday, useVerdicts } from "@/lib/store/hooks";
import type { Task, TaskDraft } from "@/lib/types";

import { Disclaimer } from "@/components/ui/Disclaimer";
import { MiniForm } from "@/components/ui/MiniForm";
import { EMPTY_DRAFT } from "@/components/ui/TaskForm";

export function CalendarScreen() {
  const today = useToday();
  const { add, update, remove } = useTasks();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  // −30/+60일 창이 아니라 보고 있는 달 기준으로 생성한다 (3/31 법인세·5/31 종소세가 해당 월에 보이도록)
  const taskList = useCalendarTasks(viewYear, viewMonth);
  // 대상 지원사업의 접수 마감일을 같은 달력에 겹쳐 보여준다 (§8 S6)
  const grants = useVerdicts();
  const deadlinesByIso = new Map<string, string[]>();
  for (const g of grants) {
    if (g.status !== "pass" || g.deadline === "상시") continue;
    const iso = dotToIso(g.deadline);
    if (!iso) continue;
    deadlinesByIso.set(iso, [...(deadlinesByIso.get(iso) ?? []), g.name]);
  }
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // ISO "YYYY-MM-DD"
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<TaskDraft>(EMPTY_DRAFT);
  const [showAdd, setShowAdd] = useState(false);
  const [addDraft, setAddDraft] = useState<TaskDraft>(EMPTY_DRAFT);

  // 달력 그리드 계산
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const tasksByDate = (day: number) => {
    const key = toIso(new Date(viewYear, viewMonth, day));
    return taskList.filter(t => t.dueDateIso === key);
  };

  const isToday = (day: number) =>
    today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;

  const inViewMonth = (t: Task) => {
    const d = t.dueDateIso ? fromIso(t.dueDateIso) : null;
    return !!d && d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  };

  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); } else setViewMonth(m => m + 1); };

  const selectedTasks = selectedDate ? taskList.filter(t => t.dueDateIso === selectedDate) : [];
  const importantTasks = taskList.filter(t => t.importance === "high" && t.dueDateIso);

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

  return (
    <div className="p-6 flex gap-5 h-full overflow-hidden">

      {/* ── 캘린더 본체 ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 월 네비게이션 */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-display font-bold text-[#111111]">
              {viewYear}년 {viewMonth + 1}월
            </h1>
            <p className="text-[#888888] text-xs mt-0.5">날짜를 클릭해 일정을 확인하세요</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); }}
              className="px-3 py-1.5 rounded-xl border border-[#E4E6EA] text-xs font-semibold text-[#444444] hover:bg-[#F5F6F8] cursor-pointer">
              오늘
            </button>
            <button onClick={prevMonth} className="w-8 h-8 rounded-xl border border-[#E4E6EA] flex items-center justify-center text-[#444444] hover:bg-[#F5F6F8] cursor-pointer">‹</button>
            <button onClick={nextMonth} className="w-8 h-8 rounded-xl border border-[#E4E6EA] flex items-center justify-center text-[#444444] hover:bg-[#F5F6F8] cursor-pointer">›</button>
          </div>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map((d, i) => (
            <div key={d} className={`text-center text-[11px] font-semibold py-1.5 ${i === 0 ? "text-rose-400" : i === 6 ? "text-blue-400" : "text-[#888888]"}`}>{d}</div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-px bg-[#E4E6EA] rounded-2xl overflow-hidden flex-1">
          {cells.map((day, idx) => {
            if (!day) return <div key={idx} className="bg-[#F5F6F8]" />;
            const dateIso = toIso(new Date(viewYear, viewMonth, day));
            const dayTasks = tasksByDate(day);
            const importantOnes = dayTasks.filter(t => t.importance === "high");
            const generalOnes = dayTasks.filter(t => t.importance !== "high");
            const isSelected = selectedDate === dateIso;
            const dow = (firstDay + day - 1) % 7;

            return (
              <button key={idx} onClick={() => setSelectedDate(isSelected ? null : dateIso)}
                className={`bg-white p-2 flex flex-col items-start text-left transition-all cursor-pointer hover:bg-[#f0eef9] ${isSelected ? "bg-[#f0eef9] ring-2 ring-inset ring-[#6E62C2]" : ""}`}>
                <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday(day) ? "bg-[#6E62C2] text-white" : dow === 0 ? "text-rose-500" : dow === 6 ? "text-blue-500" : "text-[#111111]"}`}>
                  {day}
                </span>
                {/* 중요 법정의무 도트 */}
                {importantOnes.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 w-full">
                    {importantOnes.slice(0, 2).map(t => (
                      <span key={t.id} className="w-full truncate text-[9px] font-medium bg-rose-50 text-rose-600 border border-rose-200 rounded px-1 leading-4">{t.title}</span>
                    ))}
                    {importantOnes.length > 2 && <span className="text-[9px] text-[#888888]">+{importantOnes.length - 2}</span>}
                  </div>
                )}
                {/* 일반 일정 도트 */}
                {generalOnes.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {generalOnes.slice(0, 3).map(t => (
                      <span key={t.id} className={`w-1.5 h-1.5 rounded-full ${t.type === "date" ? "bg-blue-400" : "bg-purple-400"}`} />
                    ))}
                  </div>
                )}
                {/* 지원사업 마감 도트 */}
                {(deadlinesByIso.get(dateIso)?.length ?? 0) > 0 && (
                  <div className="flex gap-0.5 mt-0.5" title={deadlinesByIso.get(dateIso)!.join(", ")}>
                    {deadlinesByIso.get(dateIso)!.slice(0, 3).map((name) => (
                      <span key={name} className="w-1.5 h-1.5 rounded-full bg-[#6E62C2]" />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* 범례 */}
        <div className="flex items-center gap-4 mt-3 text-[10px] text-[#888888]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-rose-100 border border-rose-300 inline-block" />중요 법정의무</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />날짜형</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block" />이벤트형</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#6E62C2] inline-block" />지원사업 마감</span>
        </div>
      </div>

      {/* ── 사이드 패널 ── */}
      <div className="w-72 shrink-0 flex flex-col gap-4 overflow-y-auto">

        {/* 선택된 날 또는 이번달 요약 */}
        {selectedDate ? (
          <div className="bg-white border border-[#E4E6EA] rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-[#E4E6EA] flex items-center justify-between">
              <div>
                <p className="text-[11px] text-[#888888]">선택한 날짜</p>
                <p className="text-sm font-semibold text-[#111111]">{isoToDot(selectedDate)}</p>
              </div>
              <button onClick={() => { setShowAdd(true); setAddDraft({ ...EMPTY_DRAFT, dueDate: isoToDot(selectedDate) }); setEditingId(null); }}
                className="px-3 py-1.5 rounded-xl bg-[#6E62C2] text-white text-[11px] font-semibold hover:bg-[#5a50a8] cursor-pointer">
                + 추가
              </button>
            </div>

            {showAdd && (
              <div className="px-4 py-3 border-b border-[#E4E6EA]">
                <MiniForm draft={addDraft} setDraft={setAddDraft} onSave={saveAdd} onCancel={() => setShowAdd(false)} label="추가" />
              </div>
            )}

            <div className="divide-y divide-[#F5F6F8]">
              {selectedTasks.length === 0 && !showAdd && (
                <p className="px-4 py-6 text-center text-[#888888] text-xs">이 날 등록된 일정이 없습니다.</p>
              )}
              {selectedTasks.map(task => (
                <div key={task.id} className="px-4 py-3">
                  {editingId === task.id ? (
                    <MiniForm draft={editDraft} setDraft={setEditDraft} onSave={saveEdit} onCancel={() => setEditingId(null)} label="저장" />
                  ) : (
                    <div className="group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#111111] leading-tight">{task.title}</p>
                          <p className="text-[10px] text-[#888888] mt-0.5">{task.authority}</p>
                          {task.penalty && <p className="text-[10px] text-rose-600 mt-0.5">{task.penalty}</p>}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={() => startEdit(task)} className="w-6 h-6 rounded-lg border border-[#E4E6EA] text-[#888888] hover:text-[#6E62C2] flex items-center justify-center text-[10px] cursor-pointer">✎</button>
                          <button onClick={() => remove(task.id)} className="w-6 h-6 rounded-lg border border-[#E4E6EA] text-[#888888] hover:text-rose-600 flex items-center justify-center text-[10px] cursor-pointer">✕</button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${task.done ? "bg-[#EEF4F0] text-[#2A5A46] border-[#B2D1BF]" : "bg-[#F5F6F8] text-[#888888] border-[#E4E6EA]"}`}>
                          {task.done ? "완료" : "미완료"}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${task.type === "date" ? "text-blue-700 border-blue-200 bg-blue-50" : "text-purple-700 border-purple-200 bg-purple-50"}`}>
                          {task.type === "date" ? "날짜형" : "이벤트형"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-[#F5F6F8] border border-[#E4E6EA] rounded-2xl px-4 py-4">
            <p className="text-[#888888] text-xs">날짜를 클릭하면<br />해당 날의 일정을 확인하고<br />추가·수정·삭제할 수 있습니다.</p>
          </div>
        )}

        {/* 이번달 중요 법정의무 요약 */}
        <div className="bg-white border border-[#E4E6EA] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E4E6EA]">
            <p className="text-xs font-semibold text-[#111111]">중요 법정의무</p>
            <p className="text-[10px] text-[#888888] mt-0.5">페널티가 있는 일정</p>
          </div>
          <div className="divide-y divide-[#F5F6F8] max-h-64 overflow-y-auto">
            {importantTasks.length === 0 && (
              <p className="px-4 py-4 text-center text-[#888888] text-xs">해당 없음</p>
            )}
            {importantTasks.map(task => {
              const isThisMonth = inViewMonth(task);
              return (
                <button key={task.id} onClick={() => setSelectedDate(task.dueDateIso ?? null)}
                  className={`w-full text-left px-4 py-3 hover:bg-[#F5F6F8] transition-colors cursor-pointer ${isThisMonth ? "" : "opacity-50"}`}>
                  <p className="text-[11px] font-semibold text-[#111111] truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-[#888888]">{task.dueDate}</span>
                    <span className="text-[9px] text-rose-600 truncate">{task.penalty}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 이번달 통계 */}
        <div className="bg-white border border-[#E4E6EA] rounded-2xl shadow-sm px-4 py-4">
          <p className="text-xs font-semibold text-[#111111] mb-3">{viewMonth + 1}월 통계</p>
          <div className="space-y-2">
            {[
              { label: "전체 일정", value: taskList.filter(inViewMonth).length },
              { label: "중요 법정의무", value: importantTasks.filter(inViewMonth).length },
              { label: "완료", value: taskList.filter(t => inViewMonth(t) && t.done).length },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-[11px] text-[#888888]">{row.label}</span>
                <span className="text-sm font-display font-bold text-[#111111]">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <Disclaimer />
      </div>
    </div>
  );
}
