"use client";

import { useSyncExternalStore } from "react";

import { getServerSyncSnapshot, getSyncSnapshot, subscribeSync, type SyncSnapshot } from "./sync";

export function useSyncState(): SyncSnapshot {
  return useSyncExternalStore(subscribeSync, getSyncSnapshot, getServerSyncSnapshot);
}
