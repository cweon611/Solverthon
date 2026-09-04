"use client";

// lib/store/SettingsProvider.tsx — 알림 설정 (localStorage "bridge:settings:v1")
// 이 버전은 대시보드 배너로만 알린다. 채널 토글은 저장만 하고 발송하지 않는다 (§8 S8).

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

import { usePersistent } from "./persistent";
import { STORAGE_KEYS } from "./storage";

export type NotifKey = "expiring" | "deadline" | "newGrant" | "task";
export type ChannelKey = "email" | "push";

export interface Settings {
  channels: Record<ChannelKey, boolean>;
  items: Record<NotifKey, boolean>;
}

export const DEFAULT_SETTINGS: Settings = {
  channels: { email: true, push: false },
  items: { expiring: true, deadline: true, newGrant: false, task: true },
};

interface SettingsContextValue {
  settings: Settings;
  toggleChannel: (key: ChannelKey) => void;
  toggleItem: (key: NotifKey) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = usePersistent<Settings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS);

  // 저장된 값에 없는 키는 기본값으로 채운다 (설정 항목이 늘어나도 깨지지 않게)
  const settings = useMemo<Settings>(
    () => ({
      channels: { ...DEFAULT_SETTINGS.channels, ...stored?.channels },
      items: { ...DEFAULT_SETTINGS.items, ...stored?.items },
    }),
    [stored],
  );

  const toggleChannel = useCallback(
    (key: ChannelKey) =>
      setStored((prev) => {
        const base = { channels: { ...DEFAULT_SETTINGS.channels, ...prev?.channels }, items: { ...DEFAULT_SETTINGS.items, ...prev?.items } };
        return { ...base, channels: { ...base.channels, [key]: !base.channels[key] } };
      }),
    [setStored],
  );

  const toggleItem = useCallback(
    (key: NotifKey) =>
      setStored((prev) => {
        const base = { channels: { ...DEFAULT_SETTINGS.channels, ...prev?.channels }, items: { ...DEFAULT_SETTINGS.items, ...prev?.items } };
        return { ...base, items: { ...base.items, [key]: !base.items[key] } };
      }),
    [setStored],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, toggleChannel, toggleItem }),
    [settings, toggleChannel, toggleItem],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettingsStore(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettingsStore는 <SettingsProvider> 안에서만 사용할 수 있습니다.");
  return ctx;
}
