/**
 * Read-only logical backup of Astroquint's tables to a local JSON file.
 * Complements Supabase's own backups (daily backups need the Pro plan).
 *
 *   POSTGRES_URL_NON_POOLING="postgres://…" node scripts/export-db.mjs backups/
 *
 * The output contains player data (display names, game history): store it
 * privately and never commit it. Requires `npm i -D pg` (not a runtime dep).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const url = process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;
if (!url) {
  console.error("Set POSTGRES_URL_NON_POOLING (from Vercel/Supabase) first.");
  process.exit(1);
}
const outDir = process.argv[2] ?? "backups";
const { default: pg } = await import("pg").catch(() => {
  console.error("Install the driver first: npm i -D pg");
  process.exit(1);
});
const TABLES = ["profiles", "matches", "submissions", "daily_challenges", "daily_results", "player_achievements", "rooms", "achievements"];
const client = new pg.Client({ connectionString: url.replace(/[?&]sslmode=[^&]*/, ""), ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query("begin transaction isolation level repeatable read read only");
const dump = { exportedAt: new Date().toISOString(), tables: {} };
for (const t of TABLES) {
  const { rows } = await client.query(`select * from public.${t}`);
  dump.tables[t] = rows;
  console.log(`${t}: ${rows.length} rows`);
}
await client.query("commit");
await client.end();
mkdirSync(outDir, { recursive: true });
const file = join(outDir, `astroquint-${dump.exportedAt.replace(/[:.]/g, "-")}.json`);
writeFileSync(file, JSON.stringify(dump));
console.log(`Wrote ${file}`);
