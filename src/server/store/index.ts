import "server-only";
import { storageMode, storageNotConfigured, supabaseServerConfig } from "../env";
import { createMemoryStore } from "./memory";
import { createSupabaseStore } from "./supabase";
import type { Store } from "./types";

const g = globalThis as unknown as { __aqStore?: Store };

/** Supabase when configured, otherwise an in-process memory store. */
export function getStore(): Store {
  if (g.__aqStore) return g.__aqStore;
  const mode = storageMode();
  if (mode === "not_configured") throw storageNotConfigured();
  const cfg = supabaseServerConfig();
  g.__aqStore = mode === "supabase" && cfg ? createSupabaseStore(cfg.url, cfg.serviceKey) : createMemoryStore();
  return g.__aqStore;
}

/** Test hook. */
export function __setStore(store: Store) {
  g.__aqStore = store;
}

export type * from "./types";
