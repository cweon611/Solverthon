"use client";

// lib/store/persistent.ts — localStorage를 외부 저장소로 보고 useSyncExternalStore로 구독한다.
// useEffect + setState로 읽으면 하이드레이션 직후 연쇄 렌더가 생기고, React 19의
// react-hooks/set-state-in-effect 규칙에도 걸린다. 스냅샷은 참조가 안정적이어야 하므로 캐시한다.

import { useCallback, useSyncExternalStore } from "react";

import { readJson, writeJson, type StorageKey } from "./storage";

interface Store<T> {
  get: () => T;
  set: (next: T) => void;
  invalidate: () => void;
  reload: () => void;
  subscribe: (cb: () => void) => () => void;
}

const registry = new Map<string, Store<unknown>>();

// 어떤 키가 바뀌든 알리는 전역 이벤트 — 서버 동기화(sync.ts)가 구독한다
const changeListeners = new Set<(key: StorageKey) => void>();
export function onAnyChange(cb: (key: StorageKey) => void): () => void {
  changeListeners.add(cb);
  return () => {
    changeListeners.delete(cb);
  };
}

function getStore<T>(key: StorageKey, fallback: T): Store<T> {
  const existing = registry.get(key);
  if (existing) return existing as Store<T>;

  let loaded = false;
  let cache: T = fallback;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  const store: Store<T> = {
    get: () => {
      if (!loaded) {
        cache = readJson<T>(key, fallback);
        loaded = true;
      }
      return cache;
    },
    set: (next) => {
      cache = next;
      loaded = true;
      writeJson(key, next);
      emit();
      changeListeners.forEach((l) => l(key));
    },
    invalidate: () => {
      cache = fallback;
      loaded = true;
      emit();
    },
    reload: () => {
      loaded = false; // 다음 get()에서 localStorage를 다시 읽는다
      emit();
    },
    subscribe: (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
  };
  registry.set(key, store as Store<unknown>);
  return store;
}

/** localStorage 값 하나를 읽고 쓴다. 같은 키를 쓰는 컴포넌트끼리 상태를 공유한다 */
export function usePersistent<T>(key: StorageKey, fallback: T): [T, (next: T | ((prev: T) => T)) => void] {
  const store = getStore(key, fallback);
  const value = useSyncExternalStore(
    store.subscribe,
    store.get,
    () => fallback, // 서버 렌더·하이드레이션에는 기본값을 쓴다
  );
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      store.set(typeof next === "function" ? (next as (prev: T) => T)(store.get()) : next);
    },
    [store],
  );
  return [value, set];
}

const noopSubscribe = () => () => {};

/** 서버 렌더·하이드레이션 중 false, 클라이언트 마운트 후 true — 리다이렉트 판단의 기준 (§4.3) */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** 프로필 초기화 — 캐시까지 비운다 */
export function invalidateAllStores(): void {
  for (const store of registry.values()) store.invalidate();
}

/** 서버에서 받은 값을 localStorage에 쓴 뒤 호출 — 모든 스토어가 다시 읽는다 */
export function reloadAllStores(): void {
  for (const store of registry.values()) store.reload();
}
