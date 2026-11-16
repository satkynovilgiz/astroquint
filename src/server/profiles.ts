import "server-only";
import { ACHIEVEMENTS } from "@/features/achievements/achievements";
import { getStore, type ProfileRecord } from "./store";

const ADJ = ["Swift", "Lunar", "Solar", "Nova", "Cosmic", "Stellar", "Quantum", "Orbital", "Comet", "Nebula"];
const NOUN = ["Pilot", "Voyager", "Explorer", "Navigator", "Ranger", "Drifter", "Scout", "Pioneer"];

function defaultName(id: string): string {
  const n = parseInt(id.slice(0, 8), 16);
  return `${ADJ[n % ADJ.length]} ${NOUN[Math.floor(n / ADJ.length) % NOUN.length]} ${String(n % 1000).padStart(3, "0")}`.slice(0, 20);
}

export async function ensureProfile(playerId: string, now = Date.now()): Promise<ProfileRecord> {
  const store = getStore();
  const existing = await store.getProfile(playerId);
  if (existing) return existing;
  const profile = { id: playerId, displayName: defaultName(playerId), createdAt: now };
  await store.upsertProfile(profile);
  return profile;
}

export async function renameProfile(playerId: string, displayName: string) {
  const profile = await ensureProfile(playerId);
  await getStore().upsertProfile({ ...profile, displayName });
  return { ...profile, displayName };
}

export async function profileOverview(playerId: string) {
  const store = getStore();
  const profile = await ensureProfile(playerId);
  const [history, matches, achievements] = await Promise.all([store.dailyHistory(playerId, 30), store.listMatches(playerId, 20), store.listAchievements(playerId)]);
  const completed = matches.filter((m) => m.completedAt !== null);
  const best = history.reduce((m, r) => Math.max(m, r.score), 0);
  return {
    profile: { displayName: profile.displayName, memberSince: profile.createdAt },
    stats: {
      rankedDays: history.length,
      bestDailyScore: history.length ? best : null,
      averageDailyScore: history.length ? Math.round(history.reduce((s, r) => s + r.score, 0) / history.length) : null,
      gamesCompleted: completed.length,
    },
    history: completed.map((m) => ({
      matchId: m.id,
      mode: m.mode,
      ranked: m.ranked,
      date: m.dailyDate,
      score: m.state.score,
      correct: m.state.rounds.filter((r) => r.outcome === "correct").length,
      completedAt: m.completedAt,
    })),
    achievements: ACHIEVEMENTS.map((a) => {
      const got = achievements.find((x) => x.achievementId === a.id);
      return { id: a.id, name: a.name, rule: a.rule, glyph: a.glyph, unlockedAt: got?.unlockedAt ?? null };
    }),
  };
}
