"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** False during SSR and hydration, true afterwards. Gate browser-only UI on it. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}
