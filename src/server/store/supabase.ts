import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AchievementId } from "@/features/achievements/achievements";
import type { GameState } from "@/features/gameplay/engine";
import type {
  AchievementRecord,
  DailyResultRecord,
  LeaderboardRow,
  MatchRecord,
  RoomRecord,
  Store,
} from "./types";

/**
 * Supabase (Postgres) implementation of the store. Server-only: it uses the
 * service-role key, which bypasses RLS — browsers never talk to these tables
 * directly (see supabase/migrations/0001_init.sql, where RLS denies anon).
 *
 * NOTE: written against the schema in supabase/migrations but not exercised
 * against a live project in this repository's test suite (no credentials).
 */

const iso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString());
const ms = (s: string | null) => (s === null ? null : Date.parse(s));

type MatchRow = {
  id: string;
  mode: MatchRecord["mode"];
  player_id: string;
  daily_date: string | null;
  ranked: boolean;
  state: GameState;
  version: number;
  created_at: string;
  completed_at: string | null;
};

const toMatch = (r: MatchRow): MatchRecord => ({
  id: r.id,
  mode: r.mode,
  playerId: r.player_id,
  dailyDate: r.daily_date,
  ranked: r.ranked,
  state: r.state,
  version: r.version,
  createdAt: ms(r.created_at)!,
  completedAt: ms(r.completed_at),
});

type ResultRow = { challenge_date: string; player_id: string; match_id: string; score: number; correct: number; completed_at: string };
const toResult = (r: ResultRow): DailyResultRecord => ({
  date: r.challenge_date,
  playerId: r.player_id,
  matchId: r.match_id,
  score: r.score,
  correct: r.correct,
  completedAt: ms(r.completed_at)!,
});

function must<T>(res: { data: T; error: { message: string; code?: string } | null }, what: string): T {
  if (res.error) throw new Error(`supabase ${what}: ${res.error.message}`);
  return res.data;
}
const isUniqueViolation = (e: { code?: string } | null) => e?.code === "23505";

export function createSupabaseStore(url: string, serviceKey: string): Store {
  const db: SupabaseClient = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  return {
    kind: "supabase",

    async getProfile(id) {
      const data = must(await db.from("profiles").select("*").eq("id", id).maybeSingle(), "getProfile");
      return data ? { id: data.id, displayName: data.display_name, createdAt: ms(data.created_at)! } : null;
    },
    async upsertProfile(p) {
      must(await db.from("profiles").upsert({ id: p.id, display_name: p.displayName, created_at: iso(p.createdAt) }), "upsertProfile");
    },
    async getProfiles(ids) {
      if (ids.length === 0) return [];
      const data = must(await db.from("profiles").select("*").in("id", ids), "getProfiles") ?? [];
      return data.map((d: { id: string; display_name: string; created_at: string }) => ({ id: d.id, displayName: d.display_name, createdAt: ms(d.created_at)! }));
    },

    async createMatch(m) {
      const { error } = await db.from("matches").insert({
        id: m.id,
        mode: m.mode,
        player_id: m.playerId,
        daily_date: m.dailyDate,
        ranked: m.ranked,
        state: m.state,
        version: m.version,
        created_at: iso(m.createdAt),
        completed_at: iso(m.completedAt),
      });
      if (isUniqueViolation(error)) return false;
      if (error) throw new Error(`supabase createMatch: ${error.message}`);
      return true;
    },
    async getMatch(id) {
      const data = must(await db.from("matches").select("*").eq("id", id).maybeSingle(), "getMatch");
      return data ? toMatch(data as MatchRow) : null;
    },
    async updateMatch(id, expectedVersion, patch) {
      const data = must(
        await db
          .from("matches")
          .update({ state: patch.state, completed_at: iso(patch.completedAt), version: expectedVersion + 1 })
          .eq("id", id)
          .eq("version", expectedVersion)
          .select("id"),
        "updateMatch",
      );
      return (data ?? []).length === 1;
    },
    async listMatches(playerId, limit) {
      const data = must(await db.from("matches").select("*").eq("player_id", playerId).order("created_at", { ascending: false }).limit(limit), "listMatches");
      return (data ?? []).map((r) => toMatch(r as MatchRow));
    },

    async insertSubmission(s) {
      const { error } = await db.from("submissions").insert({
        match_id: s.matchId,
        round_index: s.roundIndex,
        player_id: s.playerId,
        question_id: s.questionId,
        answer: s.answer,
        received_at: iso(s.receivedAt),
        outcome: s.outcome,
        points: s.points,
      });
      if (isUniqueViolation(error)) return false;
      if (error) throw new Error(`supabase insertSubmission: ${error.message}`);
      return true;
    },

    async getDailyQuestions(date) {
      const data = must(await db.from("daily_challenges").select("question_ids").eq("challenge_date", date).maybeSingle(), "getDailyQuestions");
      return data ? (data.question_ids as string[]) : null;
    },
    async ensureDailyQuestions(date, ids) {
      must(
        await db.from("daily_challenges").upsert({ challenge_date: date, question_ids: ids }, { onConflict: "challenge_date", ignoreDuplicates: true }),
        "ensureDailyQuestions",
      );
      return (await this.getDailyQuestions(date)) ?? ids;
    },

    async insertDailyResult(r) {
      const { error } = await db.from("daily_results").insert({
        challenge_date: r.date,
        player_id: r.playerId,
        match_id: r.matchId,
        score: r.score,
        correct: r.correct,
        completed_at: iso(r.completedAt),
      });
      if (isUniqueViolation(error)) return false;
      if (error) throw new Error(`supabase insertDailyResult: ${error.message}`);
      return true;
    },
    async getDailyResult(date, playerId) {
      const data = must(await db.from("daily_results").select("*").eq("challenge_date", date).eq("player_id", playerId).maybeSingle(), "getDailyResult");
      return data ? toResult(data as ResultRow) : null;
    },
    async leaderboard(date, limit) {
      const data = must(
        await db
          .from("daily_results")
          .select("*, profiles(display_name)")
          .eq("challenge_date", date)
          .order("score", { ascending: false })
          .order("correct", { ascending: false })
          .order("completed_at", { ascending: true })
          .limit(limit),
        "leaderboard",
      );
      const rows: LeaderboardRow[] = [];
      let rank = 0;
      let prev: number | null = null;
      (data ?? []).forEach((r: ResultRow & { profiles: { display_name: string } | null }, i: number) => {
        if (r.score !== prev) rank = i + 1;
        prev = r.score;
        rows.push({ ...toResult(r), displayName: r.profiles?.display_name ?? "Pilot", rank });
      });
      return rows;
    },
    async rankFor(date, score) {
      const higher = await db.from("daily_results").select("player_id", { count: "exact", head: true }).eq("challenge_date", date).gt("score", score);
      const total = await db.from("daily_results").select("player_id", { count: "exact", head: true }).eq("challenge_date", date);
      if (higher.error || total.error) throw new Error("supabase rankFor failed");
      return { rank: (higher.count ?? 0) + 1, total: total.count ?? 0 };
    },
    async dailyHistory(playerId, limit) {
      const data = must(await db.from("daily_results").select("*").eq("player_id", playerId).order("completed_at", { ascending: false }).limit(limit), "dailyHistory");
      return (data ?? []).map((r) => toResult(r as ResultRow));
    },

    async unlockAchievements(records) {
      if (records.length === 0) return [];
      const data = must(
        await db
          .from("player_achievements")
          .upsert(
            records.map((r) => ({ player_id: r.playerId, achievement_id: r.achievementId, match_id: r.matchId, unlocked_at: iso(r.unlockedAt) })),
            { onConflict: "player_id,achievement_id", ignoreDuplicates: true },
          )
          .select("*"),
        "unlockAchievements",
      );
      return (data ?? []).map((r: { player_id: string; achievement_id: AchievementId; match_id: string; unlocked_at: string }) => ({
        playerId: r.player_id,
        achievementId: r.achievement_id,
        matchId: r.match_id,
        unlockedAt: ms(r.unlocked_at)!,
      }));
    },
    async listAchievements(playerId) {
      const data = must(await db.from("player_achievements").select("*").eq("player_id", playerId), "listAchievements");
      return (data ?? []).map((r: { player_id: string; achievement_id: AchievementId; match_id: string; unlocked_at: string }): AchievementRecord => ({
        playerId: r.player_id,
        achievementId: r.achievement_id,
        matchId: r.match_id,
        unlockedAt: ms(r.unlocked_at)!,
      }));
    },

    async createRoom(room) {
      const { error } = await db.from("rooms").insert({
        code: room.code,
        state: room.state,
        version: room.version,
        created_at: iso(room.createdAt),
        updated_at: iso(room.updatedAt),
        expires_at: iso(room.expiresAt),
      });
      if (isUniqueViolation(error)) return false;
      if (error) throw new Error(`supabase createRoom: ${error.message}`);
      return true;
    },
    async getRoom<S>(code: string) {
      const data = must(await db.from("rooms").select("*").eq("code", code).maybeSingle(), "getRoom");
      if (!data) return null;
      return {
        code: data.code,
        state: data.state as S,
        version: data.version,
        createdAt: ms(data.created_at)!,
        updatedAt: ms(data.updated_at)!,
        expiresAt: ms(data.expires_at)!,
      } satisfies RoomRecord<S>;
    },
    async updateRoom(code, expectedVersion, state, expiresAt) {
      const data = must(
        await db
          .from("rooms")
          .update({ state, version: expectedVersion + 1, updated_at: new Date().toISOString(), expires_at: iso(expiresAt) })
          .eq("code", code)
          .eq("version", expectedVersion)
          .select("code"),
        "updateRoom",
      );
      return (data ?? []).length === 1;
    },
    async deleteExpiredRooms(now) {
      const data = must(await db.from("rooms").delete().lt("expires_at", iso(now)).select("code"), "deleteExpiredRooms");
      return (data ?? []).length;
    },
  };
}
