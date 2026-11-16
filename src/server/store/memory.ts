import "server-only";
import type {
  AchievementRecord,
  DailyResultRecord,
  LeaderboardRow,
  MatchRecord,
  ProfileRecord,
  RoomRecord,
  Store,
  SubmissionRecord,
} from "./types";

interface Tables {
  profiles: Map<string, ProfileRecord>;
  matches: Map<string, MatchRecord>;
  submissions: Map<string, SubmissionRecord>;
  daily: Map<string, string[]>;
  results: Map<string, DailyResultRecord>;
  achievements: Map<string, AchievementRecord>;
  rooms: Map<string, RoomRecord>;
}

const clone = <T>(v: T): T => structuredClone(v);

/**
 * In-process store for local development, tests and credential-free demos.
 * Data lives as long as the server process. Not suitable for multi-instance
 * production hosting — configure Supabase for that.
 */
export function createMemoryStore(): Store {
  const t: Tables = {
    profiles: new Map(),
    matches: new Map(),
    submissions: new Map(),
    daily: new Map(),
    results: new Map(),
    achievements: new Map(),
    rooms: new Map(),
  };

  const rankRows = (date: string): DailyResultRecord[] =>
    [...t.results.values()]
      .filter((r) => r.date === date)
      .sort((a, b) => b.score - a.score || b.correct - a.correct || a.completedAt - b.completedAt);

  return {
    kind: "memory",

    async getProfile(id) {
      const p = t.profiles.get(id);
      return p ? clone(p) : null;
    },
    async upsertProfile(p) {
      t.profiles.set(p.id, clone(p));
    },
    async getProfiles(ids) {
      return ids.map((id) => t.profiles.get(id)).filter((p): p is ProfileRecord => !!p).map(clone);
    },

    async createMatch(m) {
      if (t.matches.has(m.id)) return false;
      t.matches.set(m.id, clone(m));
      return true;
    },
    async getMatch(id) {
      const m = t.matches.get(id);
      return m ? clone(m) : null;
    },
    async updateMatch(id, expectedVersion, patch) {
      const m = t.matches.get(id);
      if (!m || m.version !== expectedVersion) return false;
      t.matches.set(id, { ...m, ...clone(patch), version: m.version + 1 });
      return true;
    },
    async listMatches(playerId, limit) {
      return [...t.matches.values()]
        .filter((m) => m.playerId === playerId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit)
        .map(clone);
    },

    async insertSubmission(s) {
      const key = `${s.matchId}:${s.roundIndex}:${s.playerId}`;
      if (t.submissions.has(key)) return false;
      t.submissions.set(key, clone(s));
      return true;
    },

    async getDailyQuestions(date) {
      return t.daily.get(date) ?? null;
    },
    async ensureDailyQuestions(date, ids) {
      if (!t.daily.has(date)) t.daily.set(date, [...ids]);
      return [...t.daily.get(date)!];
    },

    async insertDailyResult(r) {
      const key = `${r.date}:${r.playerId}`;
      if (t.results.has(key)) return false;
      t.results.set(key, clone(r));
      return true;
    },
    async getDailyResult(date, playerId) {
      const r = t.results.get(`${date}:${playerId}`);
      return r ? clone(r) : null;
    },
    async leaderboard(date, limit) {
      const rows = rankRows(date).slice(0, limit);
      const out: LeaderboardRow[] = [];
      let rank = 0;
      let prev: number | null = null;
      rows.forEach((r, i) => {
        if (r.score !== prev) rank = i + 1;
        prev = r.score;
        out.push({ ...clone(r), displayName: t.profiles.get(r.playerId)?.displayName ?? "Pilot", rank });
      });
      return out;
    },
    async rankFor(date, score) {
      const rows = rankRows(date);
      return { rank: rows.filter((r) => r.score > score).length + 1, total: rows.length };
    },
    async dailyHistory(playerId, limit) {
      return [...t.results.values()]
        .filter((r) => r.playerId === playerId)
        .sort((a, b) => b.completedAt - a.completedAt)
        .slice(0, limit)
        .map(clone);
    },

    async unlockAchievements(records) {
      const added: AchievementRecord[] = [];
      for (const r of records) {
        const key = `${r.playerId}:${r.achievementId}`;
        if (!t.achievements.has(key)) {
          t.achievements.set(key, clone(r));
          added.push(clone(r));
        }
      }
      return added;
    },
    async listAchievements(playerId) {
      return [...t.achievements.values()].filter((a) => a.playerId === playerId).map(clone);
    },

    async createRoom(room) {
      if (t.rooms.has(room.code)) return false;
      t.rooms.set(room.code, clone(room) as RoomRecord);
      return true;
    },
    async getRoom<S>(code: string) {
      const r = t.rooms.get(code);
      return r ? (clone(r) as RoomRecord<S>) : null;
    },
    async updateRoom(code, expectedVersion, state, expiresAt) {
      const r = t.rooms.get(code);
      if (!r || r.version !== expectedVersion) return false;
      t.rooms.set(code, { ...r, state: clone(state), version: r.version + 1, updatedAt: Date.now(), expiresAt });
      return true;
    },
    async deleteExpiredRooms(now) {
      let n = 0;
      for (const [code, r] of t.rooms) {
        if (r.expiresAt <= now) {
          t.rooms.delete(code);
          n++;
        }
      }
      return n;
    },
  };
}
