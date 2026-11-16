import "server-only";
import { randomBytes } from "node:crypto";
import { randomId } from "@/lib/utils/random";
import {
  advanceRoom,
  createRoomState,
  isConnected,
  partyQuestionIds,
  reduceRoom,
  RoomError,
  roomView,
  ROOM_TTL_MS,
  type PartyView,
  type RoomAction,
  type RoomState,
} from "@/features/party/engine";
import { ApiError } from "./http";
import { getStore } from "./store";
import { publishRoomChange } from "./realtime";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1
// Must exceed MAX_PLAYERS so a burst of simultaneous answers always lands.
const CAS_RETRIES = 16;
const backoff = (attempt: number) => (attempt === 0 ? Promise.resolve() : new Promise((r) => setTimeout(r, Math.random() * 12 * attempt)));

export function generateRoomCode(): string {
  const bytes = randomBytes(6);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

function toApiError(err: unknown): never {
  if (err instanceof RoomError) {
    const status = err.code === "not_member" ? 403 : err.code === "not_host" ? 403 : err.code === "room_full" || err.code === "game_in_progress" ? 409 : 422;
    throw new ApiError(status, err.code, err.message);
  }
  throw err;
}

export async function createRoom(pid: string, hostName: string, now = Date.now()): Promise<PartyView> {
  const store = getStore();
  void store.deleteExpiredRooms(now).catch(() => {});
  for (let i = 0; i < 8; i++) {
    const code = generateRoomCode();
    const state = createRoomState({ code, hostPid: pid, hostName, hostPublicId: randomId(4), now });
    const ok = await store.createRoom<RoomState>({ code, state, version: 0, createdAt: now, updatedAt: now, expiresAt: now + ROOM_TTL_MS });
    if (ok) return roomView(state, pid, now);
  }
  throw new ApiError(503, "busy", "Couldn't allocate a room code. Please try again.");
}

async function loadRoom(code: string, now: number) {
  const room = await getStore().getRoom<RoomState>(code);
  if (!room || room.expiresAt <= now) throw new ApiError(404, "room_not_found", "That room doesn't exist or has expired.");
  return room;
}

/** Apply an action with optimistic concurrency, then notify subscribers. */
export async function actInRoom(code: string, pid: string, action: RoomAction, now = Date.now()): Promise<PartyView> {
  const store = getStore();
  for (let attempt = 0; attempt < CAS_RETRIES; attempt++) {
    await backoff(attempt);
    const room = await loadRoom(code, now);
    let next: RoomState;
    try {
      next = reduceRoom(room.state, pid, action, now);
    } catch (err) {
      toApiError(err);
    }
    if (await store.updateRoom(code, room.version, next, now + ROOM_TTL_MS)) {
      // Heartbeats only notify others when someone's presence actually flips.
      const presenceFlipped = next.players.some((p) => {
        const before = room.state.players.find((x) => x.pid === p.pid);
        return !before || isConnected(before, now) !== isConnected(p, now);
      });
      const meaningful = action.type !== "heartbeat" || next.phase !== room.state.phase || next.hostPid !== room.state.hostPid || presenceFlipped;
      if (meaningful) void publishRoomChange(code, room.version + 1);
      return roomView(next, pid, now);
    }
  }
  throw new ApiError(409, "conflict", "The room is busy. Please retry.");
}

/**
 * Read the room for a player. Advances time-based phases (persisting them so
 * every client sees the same state) and records presence at most every few
 * seconds to keep writes cheap.
 */
export async function readRoom(code: string, pid: string | null, now = Date.now()): Promise<PartyView> {
  const store = getStore();
  for (let attempt = 0; attempt < CAS_RETRIES; attempt++) {
    const room = await loadRoom(code, now);
    const advanced = advanceRoom(room.state, now);
    const me = pid ? advanced.players.find((p) => p.pid === pid && !p.left) : undefined;
    const needsPresence = me && now - me.lastSeen > 4_000;
    const wasConnected = me ? isConnected(me, now) : true;
    if (advanced === room.state && !needsPresence) return roomView(advanced, pid, now);

    const next = needsPresence ? { ...advanced, players: advanced.players.map((p) => (p.pid === pid ? { ...p, lastSeen: now } : p)) } : advanced;
    if (await store.updateRoom(code, room.version, next, now + ROOM_TTL_MS)) {
      if (advanced !== room.state || !wasConnected) void publishRoomChange(code, room.version + 1);
      return roomView(next, pid, now);
    }
  }
  // Under heavy contention, fall back to a read-only view.
  const room = await loadRoom(code, now);
  return roomView(advanceRoom(room.state, now), pid, now);
}

export function newMatchSeed(code: string): { seed: string; questionIds: string[] } {
  const seed = `${code}:${randomId(6)}`;
  return { seed, questionIds: partyQuestionIds(seed) };
}
