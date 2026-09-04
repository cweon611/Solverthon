"use client";

// lib/store/TasksProvider.tsx — 할 일의 사용자 조작 (localStorage "bridge:tasks:v1")
// 생성된 항목은 원본을 건드리지 않고 doneIds·hiddenIds·overrides로 덮어쓴다 (§6.3·§8 S4).

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

import { dotToIso } from "@/lib/engine/format";
import type { Task, TaskDraft } from "@/lib/types";

import { usePersistent } from "./persistent";
import { STORAGE_KEYS } from "./storage";

export interface StoredTaskState {
  doneIds: string[];
  hiddenIds: string[];
  overrides: Record<string, Partial<Task>>;
  custom: Task[];
}

const EMPTY: StoredTaskState = { doneIds: [], hiddenIds: [], overrides: {}, custom: [] };

interface TasksContextValue {
  state: StoredTaskState;
  toggle: (id: string) => void;
  add: (draft: TaskDraft) => void;
  update: (id: string, draft: TaskDraft) => void;
  remove: (id: string) => void;
}

const TasksContext = createContext<TasksContextValue | null>(null);

const isCustom = (id: string) => id.startsWith("custom:");

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return `custom:${crypto.randomUUID()}`;
  return `custom:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 날짜형이고 "YYYY.MM.DD" 형식이면 dueDateIso를 채운다 (캘린더 매칭용, §4.5-16) */
function withIso(draft: TaskDraft): Pick<Task, "dueDateIso"> {
  const iso = draft.type === "date" ? dotToIso(draft.dueDate) : null;
  return { dueDateIso: iso ?? undefined };
}

export function TasksProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = usePersistent<StoredTaskState>(STORAGE_KEYS.tasks, EMPTY);

  // 저장된 값에 없는 키는 기본값으로 채운다
  const state = useMemo<StoredTaskState>(() => ({ ...EMPTY, ...stored }), [stored]);

  const toggle = useCallback(
    (id: string) =>
      setStored((prev) => {
        const base = { ...EMPTY, ...prev };
        if (isCustom(id)) {
          return { ...base, custom: base.custom.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) };
        }
        const has = base.doneIds.includes(id);
        return { ...base, doneIds: has ? base.doneIds.filter((x) => x !== id) : [...base.doneIds, id] };
      }),
    [setStored],
  );

  const add = useCallback(
    (draft: TaskDraft) =>
      setStored((prev) => {
        const base = { ...EMPTY, ...prev };
        const task: Task = { id: newId(), done: false, ...draft, ...withIso(draft) };
        return { ...base, custom: [...base.custom, task] };
      }),
    [setStored],
  );

  const update = useCallback(
    (id: string, draft: TaskDraft) =>
      setStored((prev) => {
        const base = { ...EMPTY, ...prev };
        return isCustom(id)
          ? { ...base, custom: base.custom.map((t) => (t.id === id ? { ...t, ...draft, ...withIso(draft) } : t)) }
          : { ...base, overrides: { ...base.overrides, [id]: { ...draft, ...withIso(draft) } } };
      }),
    [setStored],
  );

  const remove = useCallback(
    (id: string) =>
      setStored((prev) => {
        const base = { ...EMPTY, ...prev };
        // 생성된 항목은 그 발생 건만 숨긴다. 커스텀은 지운다.
        return isCustom(id)
          ? { ...base, custom: base.custom.filter((t) => t.id !== id) }
          : { ...base, hiddenIds: [...new Set([...base.hiddenIds, id])] };
      }),
    [setStored],
  );

  const value = useMemo<TasksContextValue>(
    () => ({ state, toggle, add, update, remove }),
    [state, toggle, add, update, remove],
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasksStore(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasksStore는 <TasksProvider> 안에서만 사용할 수 있습니다.");
  return ctx;
}
