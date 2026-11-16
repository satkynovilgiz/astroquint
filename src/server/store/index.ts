import "server-only";
import { supabaseServerConfig } from "../env";
import { createMemoryStore } from "./memory";
import { createSupabaseStore } from "./supabase";
import type { Store } from "./types";

const g = globalThis as unknown as { __aqStore?: Store };

/** Supabase when configured, otherwise an in-process memory store. */
export function getStore(): Store {
  if (g.__aqStore) return g.__aqStore;
  const cfg = supabaseServerConfig();
  g.__aqStore = cfg ? createSupabaseStore(cfg.url, cfg.serviceKey) : createMemoryStore();
  return g.__aqStore;
}

/** Test hook. */
export function __setStore(store: Store) {
  g.__aqStore = store;
}

export type * from "./types";
