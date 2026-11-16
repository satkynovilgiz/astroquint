import { beforeEach, describe, expect, it } from "vitest";
import { __resetPreferencesCache, getPreferences, setPreferences, DEFAULT_PREFERENCES } from "@/features/preferences/store";

describe("preferences store", () => {
  beforeEach(() => __resetPreferencesCache());

  it("defaults to sound off and system motion", () => {
    expect(getPreferences()).toEqual(DEFAULT_PREFERENCES);
    expect(DEFAULT_PREFERENCES.sound).toBe(false);
  });
  it("persists changes", () => {
    setPreferences({ sound: true });
    __resetPreferencesCache();
    expect(getPreferences().sound).toBe(true);
  });
  it("ignores corrupt stored data", () => {
    window.localStorage.setItem("astroquint:prefs:v1", "{not json");
    expect(getPreferences()).toEqual(DEFAULT_PREFERENCES);
  });
});
