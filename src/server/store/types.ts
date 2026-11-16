import type { GameState } from "@/features/gameplay/engine";
import type { AchievementId } from "@/features/achievements/achievements";

export type MatchMode = "daily" | "daily-practice";

export interface ProfileRecord {
  id: string;
  displayName: string;
  createdAt: number;
}

export interface MatchRecord {
  id: string;
  mode: MatchMode;
  playerId: string;
  /** UTC day key for daily matches. */
  dailyDate: string | null;
  ranked: boolean;
  state: GameState;
  /** Optimistic-concurrency version; incremented on every write. */
  version: number;
  createdAt: number;
  completedAt: number | null;
}

export interface SubmissionRecord {
  matchId: string;
  roundIndex: number;
  playerId: string;
  questionId: string;
  answer: unknown;
  receivedAt: number;
  outcome: string;
  points: number;
}

export interface DailyResultRecord {
  date: string;
  playerId: string;
  matchId: string;
  score: number;
  correct: number;
  completedAt: number;
}

export interface LeaderboardRow extends DailyResultRecord {
  displayName: string;
  rank: number;
}

export interface AchievementRecord {
  playerId: string;
  achievementId: AchievementId;
  matchId: string;
  unlockedAt: number;
}

export interface RoomRecord<S = unknown> {
  code: string;
  state: S;
  version: number;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
}

/**
 * Persistence contract. Every write that can race uses compare-and-swap on
 * `version` or a unique key, so concurrent requests can never double-apply.
 */
export interface Store {
  readonly kind: "memory" | "supabase";

  getProfile(id: string): Promise<ProfileRecord | null>;
  upsertProfile(profile: ProfileRecord): Promise<void>;
  getProfiles(ids: string[]): Promise<ProfileRecord[]>;

  /** Returns false if a match with this id already exists. */
  createMatch(match: MatchRecord): Promise<boolean>;
  getMatch(id: string): Promise<MatchRecord | null>;
  /** CAS update. Returns false if the stored version is not `expectedVersion`. */
  updateMatch(id: string, expectedVersion: number, patch: Pick<MatchRecord, "state" | "completedAt">): Promise<boolean>;
  listMatches(playerId: string, limit: number): Promise<MatchRecord[]>;

  /** Returns false on duplicate (matchId, roundIndex, playerId). */
  insertSubmission(sub: SubmissionRecord): Promise<boolean>;

  getDailyQuestions(date: string): Promise<string[] | null>;
  /** Stores the day's questions if absent and returns whatever is stored. */
  ensureDailyQuestions(date: string, questionIds: string[]): Promise<string[]>;

  /** Returns false if the player already has a ranked result for this date. */
  insertDailyResult(result: DailyResultRecord): Promise<boolean>;
  getDailyResult(date: string, playerId: string): Promise<DailyResultRecord | null>;
  leaderboard(date: string, limit: number): Promise<LeaderboardRow[]>;
  /** 1-based rank of a score on a date (ties share a rank) and the total entrants. */
  rankFor(date: string, score: number): Promise<{ rank: number; total: number }>;
  dailyHistory(playerId: string, limit: number): Promise<DailyResultRecord[]>;

  unlockAchievements(records: AchievementRecord[]): Promise<AchievementRecord[]>;
  listAchievements(playerId: string): Promise<AchievementRecord[]>;

  /** Returns false if the code is taken. */
  createRoom<S>(room: RoomRecord<S>): Promise<boolean>;
  getRoom<S>(code: string): Promise<RoomRecord<S> | null>;
  updateRoom<S>(code: string, expectedVersion: number, state: S, expiresAt: number): Promise<boolean>;
  deleteExpiredRooms(now: number): Promise<number>;
}
