import { ApiRequestError } from "./client";

export type ErrorContext = "solo-start" | "game-action" | "daily" | "daily-start" | "party-create" | "party-join" | "party-room" | "profile" | "leaderboard";

export type ErrorKind = "network" | "config" | "storage" | "session" | "rate" | "input" | "state" | "server";

export interface FriendlyError {
  kind: ErrorKind;
  title: string;
  message: string;
  retryable: boolean;
  code: string;
  requestId?: string;
}

const UNREACHABLE: Record<ErrorContext, string> = {
  "solo-start": "Unable to start your game. Check your connection and try again.",
  "game-action": "That move didn't reach the server. Check your connection and try again.",
  daily: "Couldn't load today's Daily Orbit. Check your connection and try again.",
  "daily-start": "Unable to start the Daily Orbit. Check your connection and try again.",
  "party-create": "Could not create a room. Check your connection and try again.",
  "party-join": "Could not join the room. Check your connection and try again.",
  "party-room": "Lost contact with the room. Reconnecting…",
  profile: "Couldn't load your profile. Check your connection and try again.",
  leaderboard: "Couldn't load the leaderboard. Check your connection and try again.",
};

const SERVER: Record<ErrorContext, string> = {
  "solo-start": "Unable to start your game. Please try again.",
  "game-action": "The server couldn't process that move. Please try again.",
  daily: "Daily challenges are temporarily unavailable.",
  "daily-start": "Unable to start the Daily Orbit. Please try again.",
  "party-create": "Could not create a room right now. Please try again.",
  "party-join": "Could not join the room right now. Please try again.",
  "party-room": "The room hit a problem. Please try again.",
  profile: "Your profile is temporarily unavailable.",
  leaderboard: "The leaderboard is temporarily unavailable.",
};

/**
 * Turn a failure into a message that matches what actually happened.
 * Codes come from the server's typed errors (see src/server/http.ts).
 */
export function describeError(err: unknown, ctx: ErrorContext): FriendlyError {
  if (!(err instanceof ApiRequestError)) {
    return { kind: "server", title: "Something unexpected happened", message: SERVER[ctx], retryable: true, code: "client" };
  }
  const base = { code: err.code, requestId: err.requestId };
  switch (err.code) {
    case "network":
      return { ...base, kind: "network", title: "Connection problem", message: UNREACHABLE[ctx], retryable: true };
    case "session_secret_missing":
      return { ...base, kind: "config", title: "Games are temporarily unavailable", message: err.message, retryable: true };
    case "storage_not_configured":
      return { ...base, kind: "storage", title: "Online play isn't connected yet", message: err.message, retryable: false };
    case "rate_limited":
      return { ...base, kind: "rate", title: "Slow down a little", message: "Too many requests in a short time. Wait a few seconds and try again.", retryable: true };
    case "no_session":
    case "bad_token":
    case "expired":
      return { ...base, kind: "session", title: "Your session expired", message: err.message, retryable: false };
    case "internal":
    case "server_unavailable":
      return { ...base, kind: "server", title: "Server problem", message: SERVER[ctx], retryable: true };
  }
  if (err.status === 409 || err.status === 403 || err.status === 404 || err.status === 422) {
    return { ...base, kind: "state", title: "Can't do that right now", message: err.message, retryable: false };
  }
  if (err.status === 400 || err.status === 413) {
    return { ...base, kind: "input", title: "Check your input", message: err.message, retryable: false };
  }
  return { ...base, kind: "server", title: "Server problem", message: SERVER[ctx], retryable: true };
}
