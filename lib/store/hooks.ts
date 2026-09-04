"use client";

// lib/store/hooks.ts — 화면이 쓰는 데이터 훅 (§3.5)
// 카탈로그(서버) × 프로필(localStorage) → lib/engine → 뷰모델. 판정은 전부 클라이언트에서 돈다 (§0.1-4).

import { useMemo } from "react";

import { pickTopAlert } from "@/lib/engine/alerts";
import { evaluateProgram, toFlatProfile, type ProgramVerdict } from "@/lib/engine/evaluate";
import { computeExpiringList } from "@/lib/engine/expiry";
import { lastDayOfMonth } from "@/lib/engine/format";
import { generateTasks, type TaskState } from "@/lib/engine/schedule";
import { obligationsAddedAt, simulateEmployees } from "@/lib/engine/simulate";
import type {
  Announcement,
  CatalogMeta,
  Company,
  CompanyProfile,
  DocumentType,
  ExpiringItem,
  FlatProfile,
  Grant,
  HistoryEntry,
  Obligation,
  Program,
  SimulationView,
  Task,
  TaskDraft,
  TopAlert,
} from "@/lib/types";
import { announcementStatus, toAnnouncement } from "@/lib/view/toAnnouncement";
import { toCompany } from "@/lib/view/toCompany";
import { toGrant } from "@/lib/view/toGrant";

import { useCatalogData } from "./CatalogProvider";
import { useHistoryStore } from "./HistoryProvider";
import { useProfileStore } from "./ProfileProvider";
import { useSettingsStore } from "./SettingsProvider";
import { useTasksStore } from "./TasksProvider";
import { useToday } from "./today";

export { useToday } from "./today";
export { useSettingsStore as useSettings } from "./SettingsProvider";

export function useProfile(): {
  profile: CompanyProfile | null;
  isLoaded: boolean;
  save: (p: CompanyProfile) => void;
  reset: () => void;
} {
  return useProfileStore();
}

/** 앱 셸이 프로필 없이는 화면을 그리지 않으므로 화면 안에서는 항상 존재한다 */
function useRequiredProfile(): CompanyProfile {
  const { profile } = useProfileStore();
  if (!profile) throw new Error("프로필이 없는 상태에서 화면이 렌더됐습니다. AppShell의 가드를 확인하세요.");
  return profile;
}

export function useCompany(): Company {
  const profile = useRequiredProfile();
  const today = useToday();
  return useMemo(() => toCompany(profile, today), [profile, today]);
}

export function useFlatProfile(): FlatProfile {
  const profile = useRequiredProfile();
  const today = useToday();
  return useMemo(() => toFlatProfile(profile, today), [profile, today]);
}

export function useCatalog(): {
  meta: CatalogMeta;
  programCount: number;
  programs: Program[];
  obligations: Obligation[];
  documentTypes: DocumentType[];
  dualListedIds: string[];
} {
  const { programs, obligations, documentTypes, dualListedIds, meta } = useCatalogData();
  return { meta, programCount: programs.length, programs, obligations, documentTypes, dualListedIds };
}

/** 카탈로그 × 프로필 판정 — 아래 훅들이 공유하는 계산 */
function useEngine(): {
  programs: Program[];
  verdicts: ProgramVerdict[];
  flat: FlatProfile;
  today: Date;
} {
  const { programs } = useCatalogData();
  const flat = useFlatProfile();
  const today = useToday();
  const verdicts = useMemo(
    () => programs.map((p) => evaluateProgram(p, flat, today)),
    [programs, flat, today],
  );
  return { programs, verdicts, flat, today };
}

/** 판정함(S3) — 마감된 공고는 제외한다 (§8 S3) */
export function useVerdicts(): Grant[] {
  const { programs, verdicts, today } = useEngine();
  return useMemo(
    () =>
      programs
        .map((p, i) => ({ p, v: verdicts[i] }))
        .filter(({ p }) => announcementStatus(p, today) !== "closed")
        .map(({ p, v }) => toGrant(p, v, false)),
    [programs, verdicts, today],
  );
}

/** 공고 목록(S2) — 마감 포함 전체 */
export function useAnnouncements(): Announcement[] {
  const { programs, verdicts, today } = useEngine();
  const { dualListedIds } = useCatalogData();
  return useMemo(
    () => programs.map((p, i) => toAnnouncement(p, verdicts[i], today, dualListedIds.includes(p.id))),
    [programs, verdicts, today, dualListedIds],
  );
}

export function useExpiring(): ExpiringItem[] {
  const { programs, verdicts, flat, today } = useEngine();
  return useMemo(() => computeExpiringList(programs, verdicts, flat, today), [programs, verdicts, flat, today]);
}

function useTaskState(): TaskState {
  const { state } = useTasksStore();
  const profile = useRequiredProfile();
  return useMemo(() => ({ ...state, profileCreatedAt: profile.created_at }), [state, profile.created_at]);
}

export function useTasks(): {
  tasks: Task[];
  toggle: (id: string) => void;
  add: (draft: TaskDraft) => void;
  update: (id: string, draft: TaskDraft) => void;
  remove: (id: string) => void;
} {
  const { obligations } = useCatalogData();
  const flat = useFlatProfile();
  const today = useToday();
  const taskState = useTaskState();
  const { toggle, add, update, remove } = useTasksStore();

  const tasks = useMemo(
    () => generateTasks(obligations, flat, today, taskState),
    [obligations, flat, today, taskState],
  );
  return { tasks, toggle, add, update, remove };
}

/** 캘린더(S6) — 보고 있는 달 전체를 만든다. −30/+60일 창에 갇히지 않는다 (§8 S6) */
export function useCalendarTasks(viewYear: number, viewMonth: number): Task[] {
  const { obligations } = useCatalogData();
  const flat = useFlatProfile();
  const today = useToday();
  const taskState = useTaskState();

  return useMemo(() => {
    const from = new Date(viewYear, viewMonth, 1);
    const to = new Date(viewYear, viewMonth, lastDayOfMonth(viewYear, viewMonth));
    return generateTasks(obligations, flat, today, taskState, { from, to });
  }, [obligations, flat, today, taskState, viewYear, viewMonth]);
}

export function useTopAlert(): TopAlert | null {
  const { programs, verdicts, today } = useEngine();
  const { tasks } = useTasks();
  const expiring = useExpiring();
  const { settings } = useSettingsStore();

  return useMemo(
    () =>
      pickTopAlert({
        tasks,
        expiring,
        programs,
        verdicts,
        today,
        settings: { expiring: settings.items.expiring, deadline: settings.items.deadline, task: settings.items.task },
      }),
    [tasks, expiring, programs, verdicts, today, settings],
  );
}

export function useHistory(): { entries: HistoryEntry[]; push: (entry: HistoryEntry) => void } {
  return useHistoryStore();
}

export function useSimulation(to: number): SimulationView {
  const { programs, obligations } = useCatalogData();
  const profile = useRequiredProfile();
  const today = useToday();

  return useMemo(() => {
    const diff = simulateEmployees(programs, obligations, profile, to, today);
    return {
      from: diff.from,
      to: diff.to,
      crossedThresholds: diff.crossedThresholds,
      newObligations: diff.newObligations.map((o) => o.title),
      removedObligations: diff.removedObligations.map((o) => o.title),
      lostPrograms: diff.lostPrograms.map((p) => p.title),
      gainedPrograms: diff.gainedPrograms.map((p) => p.title),
    };
  }, [programs, obligations, profile, to, today]);
}

/** 시뮬레이터 하단 3카드 — 임계값별 새 의무 제목 최대 3개 (§6.4) */
export function useEmployeeThresholdCards(thresholds: number[]): { n: string; desc: string }[] {
  const { obligations } = useCatalogData();
  return useMemo(
    () =>
      thresholds.map((t) => {
        const titles = obligationsAddedAt(obligations, t).map((o) => o.title).slice(0, 3);
        return { n: `${t}인`, desc: titles.length > 0 ? titles.join(", ") : "이 구간에서 추가되는 의무 없음" };
      }),
    [obligations, thresholds],
  );
}
