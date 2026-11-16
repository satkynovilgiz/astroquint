import { expect, type Page } from "@playwright/test";
import { getQuestion } from "../../src/features/questions/bank";
import { presentQuestion, revealFor } from "../../src/features/questions/present";
import type { Question } from "../../src/features/questions/types";

export type Plan = "right" | "wrong";

/** Click a point inside a country's shape on the GeoTap map. */
export async function clickCountry(page: Page, id: string) {
  const point = await page.evaluate((cid) => {
    const path = document.querySelector<SVGPathElement>(`[data-country="${cid}"]`);
    const svg = path?.ownerSVGElement;
    if (!path || !svg) return null;
    const box = path.getBBox();
    const pt = svg.createSVGPoint();
    for (let fy = 0.5, i = 0; i < 400; i++) {
      const fx = ((i * 0.618) % 1) * 0.9 + 0.05;
      fy = ((i * 0.381) % 1) * 0.9 + 0.05;
      pt.x = box.x + box.width * fx;
      pt.y = box.y + box.height * fy;
      if (path.isPointInFill(pt)) {
        const m = path.getScreenCTM()!;
        const p = pt.matrixTransform(m);
        return { x: p.x, y: p.y };
      }
    }
    return null;
  }, id);
  expect(point, `found a point inside country ${id}`).not.toBeNull();
  await page.mouse.click(point!.x, point!.y);
}

/** Answer the round currently on screen, given the question and presentation seed. */
export async function answerRound(page: Page, q: Question, seed: string, plan: Plan) {
  const reveal = revealFor(q, seed);
  const pub = presentQuestion(q, seed);
  switch (pub.world) {
    case "pattern-break":
    case "final-bet": {
      const correct = reveal.correctAnswer.kind === "choice" ? reveal.correctAnswer.index : 0;
      const idx = plan === "right" ? correct : (correct + 1) % 4;
      await page.getByRole("list", { name: "Answer options" }).getByRole("button").nth(idx).click();
      return;
    }
    case "truth-trap": {
      const falseIdx = reveal.correctAnswer.kind === "choice" ? reveal.correctAnswer.index : 0;
      const idx = plan === "right" ? falseIdx : (falseIdx + 1) % 3;
      await page.getByRole("button", { name: pub.statements[idx], exact: false }).first().click();
      return;
    }
    case "timeline": {
      const target = reveal.correctAnswer.kind === "order" ? reveal.correctAnswer.ids : [];
      const want = plan === "right" ? target : [...target].reverse();
      const labels = new Map(pub.events.map((e) => [e.id, e.label]));
      await page.locator("[aria-label^='Drag to reorder: ']").nth(want.length - 1).waitFor();
      // Selection sort using the accessible "Move earlier" buttons.
      for (let pos = 0; pos < want.length; pos++) {
        const label = labels.get(want[pos])!;
        for (let guard = 0; guard < 5; guard++) {
          const items = await page.locator("[aria-label^='Drag to reorder: ']").evaluateAll((els) =>
            els.map((e) => e.getAttribute("aria-label")!.replace("Drag to reorder: ", "")),
          );
          const at = items.indexOf(label);
          if (at <= pos) break;
          await page.getByRole("button", { name: `Move “${label}” earlier` }).click();
        }
      }
      await page.getByRole("button", { name: "Lock in order" }).click();
      return;
    }
    case "geotap": {
      if (q.world !== "geotap") return;
      await page.locator("[data-country]").first().waitFor();
      await clickCountry(page, plan === "right" ? q.countryId : q.countryId === "076" ? "032" : "076");
      await page.getByRole("button", { name: "Lock in this country" }).click();
      return;
    }
  }
}

export async function readSoloGame(page: Page): Promise<{ seed: string; rounds: { questionId: string }[] }> {
  return page.evaluate(() => JSON.parse(window.localStorage.getItem("astroquint:solo:v1") ?? "null"));
}

export function question(id: string): Question {
  const q = getQuestion(id);
  if (!q) throw new Error(`unknown question ${id}`);
  return q;
}

const WORLD_ORDER = ["Pattern Break", "Truth Trap", "Timeline", "GeoTap", "Final Bet"] as const;

/** Answer whatever round is on screen without knowing the solution (server-scored modes). */
export async function answerBlind(page: Page, worldIndex: number) {
  switch (worldIndex) {
    case 0:
    case 4:
      await page.getByRole("list", { name: "Answer options" }).getByRole("button").first().click();
      return;
    case 1:
      await page.getByRole("button", { name: /^1\b|.+/ }).filter({ has: page.locator("span", { hasText: /^1$/ }) }).first().click();
      return;
    case 2:
      await page.getByRole("button", { name: "Lock in order" }).click();
      return;
    case 3:
      await page.locator("[data-country]").first().waitFor();
      await clickCountry(page, "076");
      await page.getByRole("button", { name: "Lock in this country" }).click();
      return;
  }
}

/** Drive a full five-world game through intros, wager, answers and travel. */
export async function playThrough(page: Page, answer: (i: number) => Promise<void>) {
  for (let i = 0; i < 5; i++) {
    const name = WORLD_ORDER[i];
    await expect(page.getByRole("heading", { name, level: 2 })).toBeVisible({ timeout: 10_000 });
    if (i === 4) {
      await page.getByRole("button", { name: "Place your bet" }).click();
      await page.getByRole("button", { name: "Nothing", exact: true }).click();
      await page.getByRole("button", { name: /^Bet \d+ points$/ }).click();
      await page.getByRole("button", { name: /Lock wager/ }).click();
    } else {
      await page.getByRole("button", { name: `Start ${name}` }).click();
    }
    await answer(i);
    await expect(page.getByRole("heading", { level: 3, name: /Correct!|Not quite|Time's up/ })).toBeVisible({ timeout: 10_000 });
    if (i < 4) {
      await page.getByRole("button", { name: `Travel to ${WORLD_ORDER[i + 1]}` }).click();
      const skip = page.getByRole("button", { name: /Skip/ });
      if (await skip.isVisible().catch(() => false)) await skip.click().catch(() => {});
    } else {
      await page.getByRole("button", { name: "See results" }).click();
    }
  }
}
