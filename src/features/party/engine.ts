import { WORLDS, type WorldId } from "@/features/worlds/worlds";
import { getQuestion } from "@/features/questions/bank";
import { evaluateAnswer, presentQuestion, revealFor } from "@/features/questions/present";
import { selectQuestions } from "@/features/questions/select";
import type { Answer, PublicQuestion, Reveal } from "@/features/questions/types";
import { isValidWager, maxWager, resolveFinalBet, scoreRound, type RoundOutcome } from "@/features/scoring/scoring";
import { seededRandom } from "@/lib/utils/random";

/**
 * Party Mode: a pure, time-driven state machine for one room.
 *
 *   lobby ─start─▶ intro ─▶ (wager) ─▶ playing ─▶ reveal ─▶ intro … ─▶ complete ─rematch─▶ lobby
 *
 * Phase changes are derived from timestamps by `advanceRoom`, so any request
 * (from any player) moves the room forward identically — the server needs no
 * background timers. All functions are deterministic given (state, now).
 */

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const INTRO_MS = 4_500;
export const TRAVEL_INTRO_MS = 6_500; // later rounds include the travel animation
export const WAGER_MS = 15_000;
export const REVEAL_MS = 9_000;
export const GRACE_MS = 400;
export const PRESENCE_TIMEOUT_MS = 15_000;
export const HOST_HANDOFF_MS = 30_000;
export const ROOM_TTL_MS = 2 * 60 * 60 * 1000;

export type RoomPhase = "lobby" | "intro" | "wager" | "playing" | "reveal" | "complete";

export interface PartyPlayer {
  pid: string; // private session id — never sent to other clients
  publicId: string;
  name: string;
  joinedAt: number;
  lastSeen: number;
  ready: boolean;
  left: boolean;
  score: number;
}

export interface PartyAnswer {
  answer: Answer | null;
  receivedAt: number;
  outcome: RoundOutcome;
  points: number;
  wagerDelta: number | null;
}

export interface RoomState {
  code: string;
  hostPid: string;
  createdAt: number;
  matchNo: number;
  players: PartyPlayer[];
  phase: RoomPhase;
  seed: string;
  questionIds: string[];
  roundIndex: number;
  phaseStartedAt: number;
  phaseEndsAt: number | null;
  /** answers[roundIndex][publicId] */
  answers: Record<number, Record<string, PartyAnswer>>;
  /** Final Bet wagers by publicId (locked once set). */
  wagers: Record<string, number>;
  /** Score before the Final Bet round, by publicId (wager cap). */
  scoreBeforeFinal: Record<string, number>;
}

export type RoomAction =
  | { type: "join"; name: string; publicId: string }
  | { type: "leave" }
  | { type: "ready"; ready: boolean }
  | { type: "start"; questionIds: string[]; seed: string }
  | { type: "wager"; wager: number }
  | { type: "answer"; answer: Answer }
  | { type: "next" }
  | { type: "kick"; publicId: string }
  | { type: "rematch"; questionIds: string[]; seed: string }
  | { type: "heartbeat" };

export class RoomError extends Error {
  constructor(
    public code:
      | "room_full"
      | "not_member"
      | "not_host"
      | "wrong_phase"
      | "not_enough_players"
      | "players_not_ready"
      | "invalid_answer"
      | "invalid_wager"
      | "already_answered"
      | "game_in_progress"
      | "unknown_player",
    message: string,
  ) {
    super(message);
  }
}

const worldOf = (i: number): WorldId => WORLDS[i].id;
const limitOf = (i: number) => WORLDS[i].timeLimitMs;

export function createRoomState(input: { code: string; hostPid: string; hostName: string; hostPublicId: string; now: number }): RoomState {
  return {
    code: input.code,
    hostPid: input.hostPid,
    createdAt: input.now,
    matchNo: 0,
    players: [
      { pid: input.hostPid, publicId: input.hostPublicId, name: input.hostName, joinedAt: input.now, lastSeen: input.now, ready: true, left: false, score: 0 },
    ],
    phase: "lobby",
    seed: "",
    questionIds: [],
    roundIndex: 0,
    phaseStartedAt: input.now,
    phaseEndsAt: null,
    answers: {},
    wagers: {},
    scoreBeforeFinal: {},
  };
}

export function partyQuestionIds(seed: string): string[] {
  return selectQuestions(seededRandom(`party:${seed}`));
}

export const isConnected = (p: PartyPlayer, now: number) => !p.left && now - p.lastSeen < PRESENCE_TIMEOUT_MS;
const activePlayers = (s: RoomState) => s.players.filter((p) => !p.left);

function member(s: RoomState, pid: string): PartyPlayer {
  const p = s.players.find((x) => x.pid === pid && !x.left);
  if (!p) throw new RoomError("not_member", "You're not in this room.");
  return p;
}

function requireHost(s: RoomState, pid: string) {
  member(s, pid);
  if (s.hostPid !== pid) throw new RoomError("not_host", "Only the host can do that.");
}

function patchPlayer(s: RoomState, pid: string, patch: Partial<PartyPlayer>): RoomState {
  return { ...s, players: s.players.map((p) => (p.pid === pid ? { ...p, ...patch } : p)) };
}

function enterIntro(s: RoomState, roundIndex: number, at: number): RoomState {
  return { ...s, phase: "intro", roundIndex, phaseStartedAt: at, phaseEndsAt: at + (roundIndex === 0 ? INTRO_MS : TRAVEL_INTRO_MS) };
}

function enterPlaying(s: RoomState, at: number): RoomState {
  return { ...s, phase: "playing", phaseStartedAt: at, phaseEndsAt: at + limitOf(s.roundIndex) };
}

/** Score everyone who didn't answer as a timeout, then show the reveal. */
function enterReveal(s: RoomState, at: number): RoomState {
  const round = { ...(s.answers[s.roundIndex] ?? {}) };
  const isFinal = worldOf(s.roundIndex) === "final-bet";
  const players = s.players.map((p) => {
    if (p.left || round[p.publicId]) return p;
    let wagerDelta: number | null = null;
    let score = p.score;
    if (isFinal) {
      const wager = s.wagers[p.publicId] ?? 0;
      const r = resolveFinalBet({ outcome: "timeout", remainingMs: 0, timeLimitMs: limitOf(s.roundIndex), scoreBefore: p.score, wager });
      wagerDelta = r.wagerDelta;
      score = r.total;
    }
    round[p.publicId] = { answer: null, receivedAt: at, outcome: "timeout", points: 0, wagerDelta };
    return { ...p, score };
  });
  return { ...s, players, answers: { ...s.answers, [s.roundIndex]: round }, phase: "reveal", phaseStartedAt: at, phaseEndsAt: at + REVEAL_MS };
}

/** Move a room forward through any phases whose time has elapsed. */
export function advanceRoom(state: RoomState, now: number): RoomState {
  let s = state;
  for (let guard = 0; guard < 20; guard++) {
    if (s.phaseEndsAt === null || now < s.phaseEndsAt) {
      // Early reveal: everyone still connected has answered.
      if (s.phase === "playing") {
        const answered = s.answers[s.roundIndex] ?? {};
        const present = activePlayers(s).filter((p) => isConnected(p, now));
        // Reveal early once everyone still connected has answered (never when nobody is connected).
        if (present.length > 0 && present.every((p) => answered[p.publicId])) {
          s = enterReveal(s, now);
          continue;
        }
      }
      // Start the final question early once every connected player has locked a wager.
      if (s.phase === "wager") {
        const present = activePlayers(s).filter((p) => isConnected(p, now));
        if (present.length > 0 && present.every((p) => s.wagers[p.publicId] !== undefined)) {
          const wagers = { ...s.wagers };
          for (const p of activePlayers(s)) wagers[p.publicId] ??= 0;
          s = enterPlaying({ ...s, wagers }, now);
          continue;
        }
      }
      break;
    }
    const at = s.phaseEndsAt;
    switch (s.phase) {
      case "intro":
        if (worldOf(s.roundIndex) === "final-bet") {
          const scoreBeforeFinal = Object.fromEntries(s.players.map((p) => [p.publicId, p.score]));
          s = { ...s, phase: "wager", phaseStartedAt: at, phaseEndsAt: at + WAGER_MS, scoreBeforeFinal };
        } else s = enterPlaying(s, at);
        break;
      case "wager": {
        // Anyone who didn't lock a wager bets 0.
        const wagers = { ...s.wagers };
        for (const p of activePlayers(s)) wagers[p.publicId] ??= 0;
        s = enterPlaying({ ...s, wagers }, at);
        break;
      }
      case "playing":
        s = enterReveal(s, at);
        break;
      case "reveal":
        s = s.roundIndex >= WORLDS.length - 1 ? { ...s, phase: "complete", phaseStartedAt: at, phaseEndsAt: null } : enterIntro(s, s.roundIndex + 1, at);
        break;
      default:
        return s;
    }
  }
  return handOffHost(s, now);
}

/** If the host has left or vanished, the longest-standing connected player takes over. */
function handOffHost(s: RoomState, now: number): RoomState {
  const host = s.players.find((p) => p.pid === s.hostPid);
  const hostGone = !host || host.left || now - host.lastSeen > HOST_HANDOFF_MS;
  if (!hostGone) return s;
  const next = s.players.filter((p) => isConnected(p, now)).sort((a, b) => a.joinedAt - b.joinedAt)[0];
  return next && next.pid !== s.hostPid ? { ...s, hostPid: next.pid } : s;
}

export function startBlocker(s: RoomState, now: number): string | null {
  const present = activePlayers(s).filter((p) => isConnected(p, now));
  if (present.length < MIN_PLAYERS) return `Need at least ${MIN_PLAYERS} players`;
  const notReady = present.filter((p) => p.pid !== s.hostPid && !p.ready);
  if (notReady.length) return `Waiting for ${notReady.length} player${notReady.length === 1 ? "" : "s"} to get ready`;
  return null;
}

/** Apply a player's action. Throws RoomError for rule violations. */
export function reduceRoom(input: RoomState, pid: string, action: RoomAction, now: number): RoomState {
  // Record the caller's presence first, so they count as connected while the room advances.
  const existing = input.players.find((p) => p.pid === pid);
  let s = existing && !existing.left ? patchPlayer(input, pid, { lastSeen: now }) : input;
  s = advanceRoom(s, now);

  switch (action.type) {
    case "heartbeat":
      member(s, pid);
      return s;

    case "join": {
      if (existing && !existing.left) return patchPlayer(s, pid, { name: action.name });
      if (existing?.left) {
        // Reconnecting after leaving: allowed in the lobby only.
        if (s.phase !== "lobby") throw new RoomError("game_in_progress", "A game is in progress. You can rejoin when it ends.");
        return patchPlayer(s, pid, { left: false, ready: false, lastSeen: now, name: action.name, score: 0 });
      }
      if (s.phase !== "lobby") throw new RoomError("game_in_progress", "This room's game has already started.");
      if (activePlayers(s).length >= MAX_PLAYERS) throw new RoomError("room_full", `This room is full (${MAX_PLAYERS} players).`);
      return {
        ...s,
        players: [...s.players, { pid, publicId: action.publicId, name: action.name, joinedAt: now, lastSeen: now, ready: false, left: false, score: 0 }],
      };
    }

    case "leave": {
      member(s, pid);
      s = patchPlayer(s, pid, { left: true, ready: false });
      if (s.hostPid === pid) {
        const next = activePlayers(s).sort((a, b) => a.joinedAt - b.joinedAt)[0];
        if (next) s = { ...s, hostPid: next.pid };
      }
      return advanceRoom(s, now);
    }

    case "ready":
      member(s, pid);
      if (s.phase !== "lobby") throw new RoomError("wrong_phase", "The game has already started.");
      return patchPlayer(s, pid, { ready: action.ready });

    case "kick": {
      requireHost(s, pid);
      if (s.phase !== "lobby") throw new RoomError("wrong_phase", "Players can only be removed in the lobby.");
      const target = s.players.find((p) => p.publicId === action.publicId && !p.left);
      if (!target) throw new RoomError("unknown_player", "That player isn't here.");
      if (target.pid === pid) throw new RoomError("wrong_phase", "You can't remove yourself. Use Leave instead.");
      return { ...s, players: s.players.filter((p) => p.publicId !== action.publicId) };
    }

    case "start":
    case "rematch": {
      requireHost(s, pid);
      if (action.type === "start" && s.phase !== "lobby") throw new RoomError("wrong_phase", "The game has already started.");
      if (action.type === "rematch") {
        if (s.phase !== "complete") throw new RoomError("wrong_phase", "Finish this game first.");
        // Back to the lobby with everyone still here; scores reset.
        return {
          ...s,
          phase: "lobby",
          phaseStartedAt: now,
          phaseEndsAt: null,
          players: s.players.filter((p) => !p.left).map((p) => ({ ...p, score: 0, ready: p.pid === s.hostPid })),
          answers: {},
          wagers: {},
          scoreBeforeFinal: {},
          questionIds: [],
          roundIndex: 0,
        };
      }
      const blocker = startBlocker(s, now);
      if (blocker) throw new RoomError(blocker.startsWith("Need") ? "not_enough_players" : "players_not_ready", blocker);
      return enterIntro(
        {
          ...s,
          matchNo: s.matchNo + 1,
          seed: action.seed,
          questionIds: action.questionIds,
          answers: {},
          wagers: {},
          scoreBeforeFinal: {},
          // Players who left before the start are dropped from this match.
          players: s.players.filter((p) => !p.left).map((p) => ({ ...p, score: 0 })),
        },
        0,
        now,
      );
    }

    case "wager": {
      const me = member(s, pid);
      if (s.phase !== "wager") throw new RoomError("wrong_phase", "Wagers are closed.");
      if (s.wagers[me.publicId] !== undefined) throw new RoomError("already_answered", "Your wager is already locked.");
      const balance = s.scoreBeforeFinal[me.publicId] ?? me.score;
      if (!isValidWager(action.wager, balance)) throw new RoomError("invalid_wager", `Wager must be between 0 and ${maxWager(balance)}.`);
      return advanceRoom({ ...s, wagers: { ...s.wagers, [me.publicId]: action.wager } }, now);
    }

    case "answer": {
      const me = member(s, pid);
      if (s.phase !== "playing") throw new RoomError("wrong_phase", "This round isn't accepting answers.");
      const round = s.answers[s.roundIndex] ?? {};
      if (round[me.publicId]) throw new RoomError("already_answered", "You've already answered this round.");
      const q = getQuestion(s.questionIds[s.roundIndex]);
      if (!q) throw new RoomError("invalid_answer", "Unknown question.");
      const evaluation = evaluateAnswer(q, s.seed, action.answer);
      if (!evaluation.valid) throw new RoomError("invalid_answer", "That answer isn't valid for this round.");
      const deadline = s.phaseEndsAt!;
      const effective = now > deadline && now <= deadline + GRACE_MS ? deadline : now;
      const expired = effective > deadline;
      const outcome: RoundOutcome = expired ? "timeout" : evaluation.correct ? "correct" : "incorrect";
      const scoring = { outcome, remainingMs: Math.max(0, deadline - effective), timeLimitMs: limitOf(s.roundIndex) };
      let points: number;
      let wagerDelta: number | null = null;
      let score: number;
      if (worldOf(s.roundIndex) === "final-bet") {
        const r = resolveFinalBet({ ...scoring, scoreBefore: me.score, wager: s.wagers[me.publicId] ?? 0 });
        points = r.roundPoints;
        wagerDelta = r.wagerDelta;
        score = r.total;
      } else {
        points = scoreRound(scoring);
        score = me.score + points;
      }
      s = patchPlayer(s, pid, { score });
      s = { ...s, answers: { ...s.answers, [s.roundIndex]: { ...round, [me.publicId]: { answer: action.answer, receivedAt: now, outcome, points, wagerDelta } } } };
      return advanceRoom(s, now); // may reveal early if everyone has answered
    }

    case "next":
      requireHost(s, pid);
      if (s.phase !== "reveal") throw new RoomError("wrong_phase", "Nothing to skip right now.");
      return advanceRoom({ ...s, phaseEndsAt: now }, now);
  }
}

// ── Views ────────────────────────────────────────────────────────────────

export interface PartyPlayerView {
  id: string;
  name: string;
  isHost: boolean;
  isYou: boolean;
  ready: boolean;
  connected: boolean;
  score: number;
  answered: boolean;
  round: { outcome: RoundOutcome; points: number; wagerDelta: number | null } | null;
}

export interface PartyView {
  code: string;
  phase: RoomPhase;
  matchNo: number;
  serverNow: number;
  phaseStartedAt: number;
  phaseEndsAt: number | null;
  roundIndex: number;
  worldId: WorldId;
  you: { id: string; name: string; isHost: boolean; score: number } | null;
  players: PartyPlayerView[];
  question: PublicQuestion | null;
  yourAnswer: Answer | null;
  yourWager: number | null;
  maxWager: number;
  reveal: Reveal | null;
  /** Your outcome per world, only for rounds already revealed. */
  yourRounds: (RoundOutcome | null)[];
  startBlocker: string | null;
  standings: { id: string; name: string; score: number; rank: number; isYou: boolean }[];
}

export function roomView(s: RoomState, pid: string | null, now: number): PartyView {
  const me = s.players.find((p) => p.pid === pid && !p.left) ?? null;
  const round = s.answers[s.roundIndex] ?? {};
  const showQuestion = s.phase === "playing" || s.phase === "reveal";
  const q = s.questionIds.length ? getQuestion(s.questionIds[s.roundIndex]) : undefined;
  const mine = me ? round[me.publicId] : undefined;
  const ranked = [...s.players.filter((p) => !p.left)].sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt);
  let rank = 0;
  let prev: number | null = null;
  const standings = ranked.map((p, i) => {
    if (p.score !== prev) rank = i + 1;
    prev = p.score;
    return { id: p.publicId, name: p.name, score: p.score, rank, isYou: p.pid === pid };
  });

  let reveal: Reveal | null = null;
  if (s.phase === "reveal" && q) {
    reveal = mine?.answer ? evaluateAnswer(q, s.seed, mine.answer).valid ? { ...revealFor(q, s.seed), correct: mine.outcome === "correct" } : null : revealFor(q, s.seed);
  }

  return {
    code: s.code,
    phase: s.phase,
    matchNo: s.matchNo,
    serverNow: now,
    phaseStartedAt: s.phaseStartedAt,
    phaseEndsAt: s.phaseEndsAt,
    roundIndex: s.roundIndex,
    worldId: worldOf(s.roundIndex),
    you: me ? { id: me.publicId, name: me.name, isHost: s.hostPid === me.pid, score: me.score } : null,
    players: s.players
      .filter((p) => !p.left)
      .map((p) => ({
        id: p.publicId,
        name: p.name,
        isHost: s.hostPid === p.pid,
        isYou: p.pid === pid,
        ready: p.ready,
        connected: isConnected(p, now),
        score: p.score,
        answered: !!round[p.publicId] && s.phase !== "lobby",
        // Other players' results are only visible once the round is revealed.
        round: (s.phase === "reveal" || s.phase === "complete") && round[p.publicId] ? { outcome: round[p.publicId].outcome, points: round[p.publicId].points, wagerDelta: round[p.publicId].wagerDelta } : null,
      })),
    question: showQuestion && q ? presentQuestion(q, s.seed) : null,
    yourAnswer: mine?.answer ?? null,
    yourWager: me ? (s.wagers[me.publicId] ?? null) : null,
    maxWager: me ? maxWager(s.scoreBeforeFinal[me.publicId] ?? me.score) : 0,
    reveal,
    yourRounds: WORLDS.map((_, i) => {
      const revealed = i < s.roundIndex || (i === s.roundIndex && (s.phase === "reveal" || s.phase === "complete"));
      return me && revealed && s.phase !== "lobby" ? (s.answers[i]?.[me.publicId]?.outcome ?? null) : null;
    }),
    startBlocker: s.phase === "lobby" ? startBlocker(s, now) : null,
    standings,
  };
}
