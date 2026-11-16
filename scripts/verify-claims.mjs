/**
 * Source-text verification for the question bank.
 *
 *   node scripts/verify-claims.mjs          # writes content/verification.json
 *
 * For every factual claim, fetches the cited Wikipedia article's wikitext and
 * checks that the key fact (a year, a capital, an answer) appears in it.
 * A claim is "verified" only if its pattern is found in its own cited source.
 * This proves the source *supports* the fact; it is not a substitute for a
 * human editor's judgement, and the report says so.
 *
 * Pure maths questions are verified by computation instead (tests/unit).
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const load = (f) => JSON.parse(readFileSync(path.join(root, "content/questions", f), "utf8"));

/** Escape for RegExp. */
const re = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** A year like -2560 → patterns for "2560 BC" / "2560 BCE"; 80 → "80 AD|AD 80|80 CE". */
function yearPattern(y) {
  if (y < 0) return `${-y}\\s*(?:&nbsp;)?\\s*(?:BC|BCE|\\}\\}\\s*BC)`;
  if (y < 1000) return `(?:AD\\s*${y}|${y}\\s*(?:AD|CE)|\\b${y}\\b)`;
  return `\\b${y}\\b`;
}

const claims = [];

// Timeline: every event's year must appear in its cited article.
for (const q of load("timeline.json")) {
  for (const e of q.events) {
    claims.push({ id: q.id, claim: `${e.label} — ${e.dateLabel}`, url: e.source.url, patterns: [yearPattern(e.year)] });
  }
}

// GeoTap: the clue/answer facts.
const GEO_EXTRA = {
  "gt-001": ["Tokyo"], "gt-002": ["Brasília|Brasilia"], "gt-003": ["Cairo", "Nile"], "gt-004": ["New Delhi", "Himalaya"],
  "gt-005": ["Mexico City"], "gt-006": ["Rome"], "gt-007": ["archipelagic"], "gt-008": ["Pretoria", "Cape Town", "Bloemfontein"],
  "gt-009": ["Antananarivo"], "gt-010": ["Santiago"], "gt-011": ["Wellington"], "gt-012": ["Madrid", "Iberian"],
  "gt-013": ["Kyiv", "Black Sea"], "gt-014": ["Nairobi", "Indian Ocean"], "gt-015": ["Lima", "Pacific"],
  "gt-016": ["Astana", "landlocked"], "gt-017": ["Ulaanbaatar", "landlocked"], "gt-018": ["Abuja", "Gulf of Guinea"],
  "gt-019": ["Canberra"], "gt-020": ["Ottawa", "Ontario"], "gt-021": ["Bangkok"], "gt-022": ["Riyadh", "Arabian Peninsula"],
  "gt-023": ["Buenos Aires", "Andes"],
};
for (const q of load("geotap.json")) {
  claims.push({ id: q.id, claim: q.explanation, url: q.sources[0].url, patterns: GEO_EXTRA[q.id] ?? [re(q.countryName)] });
}

// Final Bet: the correct answer (and key qualifier) must appear in the source.
const FINAL = {
  "fb-001": ["[Ww]olfram", "\\|\\s*symbol\\s*=\\s*W\\b|symbol '''W'''|symbol W\\b"],
  "fb-003": ["97\\.7|98"],
  "fb-004": ["9 November 1989|November 9, 1989"],
  "fb-005": ["[Tt]alc"],
  "fb-007": ["1609", "1619"],
  "fb-008": ["[Nn]atrium", "symbol\\s*=\\s*Na\\b|'''Na'''|symbol Na\\b|\\bNa\\b"],
  "fb-009": ["largest internal organ"],
  "fb-010": ["78"],
  "fb-011": ["eight bits|8 bits|8-bit"],
};
for (const q of load("final-bet.json")) {
  if (!q.sources.length) continue; // maths: verified by computation in tests
  claims.push({ id: q.id, claim: `${q.prompt} → ${q.options[q.answer]}`, url: q.sources[0].url, patterns: FINAL[q.id] ?? [re(q.options[q.answer])] });
}

// Truth Trap: each statement's key fact.
const TRUTH = {
  "tt-001": [["retrograde"], ["hottest"], ["243"]],
  "tt-002": [["three hearts"], ["blind|vision|eyes"], ["backward"]],
  "tt-003": [["206"], ["longest"], ["smallest"]],
  "tt-004": [["11 time zones|eleven time zones"], ["Nile", "Amazon"], ["Antarctic|polar"]],
  "tt-005": [["expand|less dense"], ["8\\.3|8 minutes|8&nbsp;min|eight minutes"], ["1,?4[89][0-9]|1481|1500"]],
  "tt-006": [["1889"], ["Moon"], ["1969"]],
  "tt-007": [["berr"], ["accessory|aggregate|not.{0,20}berr"], ["legume"]],
  "tt-008": [["largest planet"], ["less dense than water|0\\.687|0\\.69"], ["dwarf planet"]],
  "tt-009": [["largest animal"], ["memory"], ["[Ee]ucalyptus"]],
  "tt-010": [["Mandarin"], ["Olympia"], ["0\\.49|0\\.44|smallest"]],
  "tt-011": [["carbon"], ["[Aa]luminium|[Aa]luminum"], ["lighter than air|less dense than air|lifting gas|balloon"]],
};
for (const q of load("truth-trap.json")) {
  q.statements.forEach((s, i) => {
    claims.push({ id: q.id, claim: s.text, url: s.source.url, patterns: TRUTH[q.id]?.[i] ?? [] });
  });
}

const cache = new Map();
async function wikitext(url) {
  const title = decodeURIComponent(url.split("/wiki/")[1]);
  if (cache.has(title)) return cache.get(title);
  const res = await fetch(`https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(title)}&action=raw`, {
    headers: { "User-Agent": "content-fact-checker/1.0" },
  });
  const text = res.ok ? await res.text() : "";
  cache.set(title, text);
  await new Promise((r) => setTimeout(r, 250));
  return text;
}

const results = [];
for (const c of claims) {
  const text = await wikitext(c.url);
  const missing = c.patterns.filter((p) => !new RegExp(p).test(text));
  results.push({ ...c, verified: text.length > 0 && c.patterns.length > 0 && missing.length === 0, missing });
}

const byQuestion = {};
for (const r of results) {
  byQuestion[r.id] ??= { verified: true, claims: [] };
  byQuestion[r.id].claims.push({ claim: r.claim, source: r.url, verified: r.verified, ...(r.missing.length ? { notFound: r.missing } : {}) });
  if (!r.verified) byQuestion[r.id].verified = false;
}
const report = {
  generatedAt: new Date().toISOString(),
  method: "Key fact pattern found in the cited Wikipedia article's wikitext. Supports, but does not replace, human review.",
  questions: byQuestion,
};
writeFileSync(path.join(root, "content/verification.json"), JSON.stringify(report, null, 1) + "\n");
const ok = Object.values(byQuestion).filter((q) => q.verified).length;
console.log(`claims: ${results.filter((r) => r.verified).length}/${results.length} verified · questions: ${ok}/${Object.keys(byQuestion).length} fully verified`);
for (const r of results.filter((x) => !x.verified)) console.log(`  ✗ ${r.id}: ${r.claim.slice(0, 70)} — not found: ${r.missing.join(", ")}`);
