"use client";

import { useSyncExternalStore } from "react";
import {
  getPreferences,
  getServerPreferences,
  setPreferences,
  subscribePreferences,
  type Preferences,
} from "./store";

export function usePreferences(): [Preferences, (patch: Partial<Preferences>) => void] {
  const prefs = useSyncExternalStore(subscribePreferences, getPreferences, getServerPreferences);
  return [prefs, setPreferences];
}
