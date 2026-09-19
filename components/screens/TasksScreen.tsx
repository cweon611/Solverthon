"use client";

// design/BizBuddyPage.tsx 645–824행 TasksPage. FormRow·TaskForm은 components/ui/TaskForm.tsx로 호이스팅(§4.5-2).
// 상태는 공유 useTasks()(§4.5-4). id는 문자열(§4.5-18).

import { TriangleAlertIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PHOTOS } from "@/lib/constants";
import { useTasks } from "@/lib/store/hooks";
import type { Task, TaskDraft } from "@/lib/types";

import { Disclaimer } from "@/components/ui/Disclaimer";
import { Img } from "@/components/ui/Img";
import { EMPTY_DRAFT, TaskForm } from "@/components/ui/TaskForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { chip } from "@/components/ui/button-variants";
import { Checkbox } from "@/components/ui/checkbox";
import { cardMutedVariants, chipVariants } from "@/components/ui/variants";

// TasksProvider와 같은 규칙. 삭제 문구가 두 경우로 갈려서 여기서도 판별한다:
// 직접 추가한 항목은 사라지고, 법정 의무에서 생성된 항목은 그 회차만 숨는다(id가 회차별로 다르다).
const isCustomTask = (id: string) => id.startsWith("custom:");

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

  // 확인 대화상자를 통과한 뒤에만 불린다.
  // 되돌리기 버튼은 붙이지 않았다 — 스토어가 싸게 지원하지 않는다:
  // 생성 항목의 remove는 hiddenIds에 넣기만 하고 되살리는 함수가 없고, 커스텀 항목은
  // add()가 새 id를 발급해 완료 여부와 순서를 잃는다. 그 한 버튼 때문에 스토어를 비틀지 않는다.
  const confirmRemove = (task: Task) => {
    remove(task.id);
    toast.success(isCustomTask(task.id) ? "할 일을 삭제했습니다." : "이 회차를 목록에서 숨겼습니다.", {
      description: task.title,
    });
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
            className={chip({ on: typeFilter === f, elevate: "brand" })}>
            {f === "all" ? "전체" : f === "date" ? "날짜형" : "이벤트형"}
          </button>
        ))}
        <Button variant="primary" pad="4x1.5" text="xs" radius="xl" elevate="sm" motion="colors"
          className="ml-auto flex items-center gap-1.5"
          onClick={() => { setShowAdd(v => !v); setEditingId(null); setAddDraft(EMPTY_DRAFT); }}>
          + 항목 추가
        </Button>
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
                {/* 체크박스 — 손수 만든 <button>을 <Checkbox>로 교체했다. 그림은 그대로고
                    스페이스바 조작·role=checkbox·aria-checked가 새로 생긴다.
                    첫 줄에 맞추는 위쪽 여백은 이 호출부의 사정이라 여기서 준다(스캐너가 주석도
                    후보로 읽으므로 유틸리티 이름을 적지 않는다). 이름은 옆의 제목이 맡는다. */}
                <Checkbox
                  className="mt-0.5"
                  checked={task.done}
                  onCheckedChange={() => toggle(task.id)}
                  aria-labelledby={`task-title-${task.id}`}
                />
                {/* 내용 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p id={`task-title-${task.id}`} className={`text-sm font-semibold ${task.done ? "line-through text-[#888888]" : "text-[#111111]"}`}>{task.title}</p>
                    <Badge size="md" tone={task.type === "date" ? "info" : "purple"}>
                      {task.type === "date" ? "날짜형" : "이벤트형"}
                    </Badge>
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
                    <span className={chipVariants({ tone: "danger" })}>{task.penalty}</span>
                  )}
                  {/* 마우스를 올려야만 보이던 두 버튼이라 키보드로는 닿아도 보이지 않았다 —
                      초점이 안에 들어오면 같이 드러나게 한다(새로 더한 층, 마우스 동작은 그대로). */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <Button variant="iconMuted" box="7" text="xs" radius="lg" center motion="colors"
                      className="bg-white hover:text-[#6E62C2] hover:border-[#6E62C2]/40"
                      onClick={() => startEdit(task)} title="수정" aria-label={`${task.title} 수정`}>✎</Button>
                    {/* 사용자가 적어 넣은 데이터라 지우기 전에 한 번 묻는다. 제목을 그대로 보여 준다. */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="iconMuted" box="7" text="xs" radius="lg" center motion="colors"
                          className="bg-white hover:text-rose-600 hover:border-rose-200"
                          title="삭제" aria-label={`${task.title} 삭제`}>✕</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogMedia className="border-rose-200 bg-rose-50 text-rose-600">
                            <TriangleAlertIcon />
                          </AlertDialogMedia>
                          <AlertDialogTitle>‘{task.title}’을(를) 삭제할까요?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {isCustomTask(task.id) ? (
                              <>직접 추가한 할 일입니다. 지우면 되돌릴 수 없습니다.</>
                            ) : (
                              <>
                                법정 의무에서 자동으로 만들어진 항목입니다. 기한{" "}
                                <span className="font-mono">{task.dueDate}</span> 회차만 목록에서 사라지고, 다음 회차는 다시 나타납니다.
                              </>
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction variant="destructive" onClick={() => confirmRemove(task)}>삭제</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className={cardMutedVariants({ pad: "p10", center: true })}>
            <p className="text-[#888888] text-sm">할 일이 없습니다.</p>
          </div>
        )}
      </div>
    <Disclaimer />
    </div>
  );
}
