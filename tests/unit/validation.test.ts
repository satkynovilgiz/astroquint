import { describe, expect, it } from "vitest";
import { displayNameSchema, gameActionSchema, roomCodeSchema } from "@/lib/validation/game";

describe("input validation", () => {
  it("normalises and validates display names", () => {
    expect(displayNameSchema.parse("  Nova   Pilot ")).toBe("Nova Pilot");
    expect(displayNameSchema.safeParse("x").success).toBe(false);
    expect(displayNameSchema.safeParse("<script>").success).toBe(false);
    expect(displayNameSchema.safeParse("a".repeat(21)).success).toBe(false);
    expect(displayNameSchema.safeParse("Zoë_42").success).toBe(true);
  });
  it("accepts only well-formed game actions", () => {
    expect(gameActionSchema.safeParse({ type: "submit", answer: { kind: "choice", index: 2 } }).success).toBe(true);
    expect(gameActionSchema.safeParse({ type: "submit", answer: { kind: "choice", index: -1 } }).success).toBe(false);
    expect(gameActionSchema.safeParse({ type: "lockWager", wager: 301 }).success).toBe(false);
    expect(gameActionSchema.safeParse({ type: "hack" }).success).toBe(false);
  });
  it("validates room codes (no ambiguous characters)", () => {
    expect(roomCodeSchema.safeParse("K7QX4M").success).toBe(true);
    expect(roomCodeSchema.safeParse("K7QX4O").success).toBe(false);
    expect(roomCodeSchema.safeParse("k7qx4m").success).toBe(false);
  });
});
