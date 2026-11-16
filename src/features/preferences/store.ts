/**
 * Per-device player preferences (sound, motion). These are conveniences only —
 * nothing competitive is ever stored here. Storage access is wrapped because it
 * can throw in private windows or when site data is blocked.
 */

export type MotionPreference = "system" | "reduced";

export interface Preferences {
  sound: boolean;
  motion: MotionPreference;
}

export const DEFAULT_PREFERENCES: Preferences = { sound: false, motion: "system" };

const STORAGE_KEY = "astroquint:prefs:v1";
const listeners = new Set<() => void>();
let cache: Preferences | null = null;

function read(): Preferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return {
      sound: typeof parsed.sound === "boolean" ? parsed.sound : DEFAULT_PREFERENCES.sound,
      motion: parsed.motion === "reduced" ? "reduced" : "system",
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function getPreferences(): Preferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  if (!cache) cache = read();
  return cache;
}

export function getServerPreferences(): Preferences {
  return DEFAULT_PREFERENCES;
}

export function setPreferences(patch: Partial<Preferences>): void {
  cache = { ...getPreferences(), ...patch };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Storage unavailable: keep the in-memory value for this session.
  }
  listeners.forEach((l) => l());
}

export function subscribePreferences(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test helper. */
export function __resetPreferencesCache(): void {
  cache = null;
}
