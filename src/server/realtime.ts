import "server-only";
import { EventEmitter } from "node:events";
import { supabaseServerConfig } from "./env";

/**
 * "Room changed" notifications. Messages carry only a version number — never
 * game data — so they can't be used to cheat; clients always re-fetch the
 * authoritative state from the API.
 *
 * - In-process emitter: powers the SSE endpoint (single-server/local).
 * - Supabase Realtime broadcast (when configured): reaches clients connected
 *   to any server instance.
 */
const g = globalThis as unknown as { __aqBus?: EventEmitter };
const bus = (g.__aqBus ??= (() => {
  const e = new EventEmitter();
  e.setMaxListeners(500);
  return e;
})());

export function subscribeRoom(code: string, fn: (version: number) => void): () => void {
  bus.on(code, fn);
  return () => bus.off(code, fn);
}

export async function publishRoomChange(code: string, version: number): Promise<void> {
  bus.emit(code, version);
  const cfg = supabaseServerConfig();
  if (!cfg) return;
  try {
    await fetch(`${cfg.url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: cfg.serviceKey, Authorization: `Bearer ${cfg.serviceKey}` },
      body: JSON.stringify({ messages: [{ topic: `room:${code}`, event: "changed", payload: { v: version } }] }),
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // Best effort: clients also poll, so a missed broadcast only adds latency.
  }
}
