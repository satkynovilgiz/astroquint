import { describe, expect, it } from "vitest";
import { formatCountdown, msUntilNextUtcDay, utcDayKey } from "@/features/daily/time";

describe("daily UTC rollover", () => {
  it("keys days by UTC, not local time", () => {
    expect(utcDayKey(Date.UTC(2026, 10, 15, 23, 59, 59))).toBe("2026-11-15");
    expect(utcDayKey(Date.UTC(2026, 10, 16, 0, 0, 0))).toBe("2026-11-16");
  });
  it("counts down to the next 00:00 UTC", () => {
    expect(msUntilNextUtcDay(Date.UTC(2026, 10, 15, 23, 0, 0))).toBe(3_600_000);
    expect(msUntilNextUtcDay(Date.UTC(2026, 10, 16, 0, 0, 0))).toBe(86_400_000);
  });
  it("formats HH:MM:SS and clamps negatives", () => {
    expect(formatCountdown(3_723_000)).toBe("01:02:03");
    expect(formatCountdown(-5)).toBe("00:00:00");
  });
});
