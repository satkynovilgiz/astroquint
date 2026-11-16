/**
 * Dry run of public.astroquint_cleanup(): reports how many rows each rule
 * WOULD delete, without deleting anything and without printing personal data.
 *
 *   POSTGRES_URL_NON_POOLING="postgres://…" node scripts/cleanup-dry-run.mjs
 *
 * Runs in a READ ONLY transaction, so the database rejects any write even if
 * this script were edited by mistake. Rules mirror supabase/migrations
 * (0001_init.sql, and 0002_rate_limits.sql when applied). See
 * docs/data-retention.md.
 */

export const RULES = [
  { table: "rooms", rule: "expired Party rooms", where: "expires_at < now()" },
  { table: "matches", rule: "Daily practice matches older than 30 days", where: "mode = 'daily-practice' and created_at < now() - interval '30 days'" },
  { table: "rate_limits", rule: "rate-limit windows older than 1 day", where: "window_start < now() - interval '1 day'", optional: true },
];

/** Works with any client exposing `query(sql)` (node-postgres or PGlite). */
export async function dryRun(client) {
  await client.query("begin transaction read only");
  try {
    const report = [];
    for (const r of RULES) {
      const exists = await client.query(`select to_regclass('public.${r.table}') is not null as ok`);
      if (!exists.rows[0].ok) {
        if (r.optional) report.push({ ...r, wouldDelete: null, note: "table not present (migration not applied)" });
        else throw new Error(`missing table ${r.table}`);
        continue;
      }
      const total = await client.query(`select count(*)::int as n from public.${r.table}`);
      const hit = await client.query(`select count(*)::int as n from public.${r.table} where ${r.where}`);
      report.push({ ...r, total: total.rows[0].n, wouldDelete: hit.rows[0].n });
    }
    // Practice matches cascade to their submissions.
    const sub = await client.query(
      "select count(*)::int as n from public.submissions s join public.matches m on m.id = s.match_id where m.mode = 'daily-practice' and m.created_at < now() - interval '30 days'",
    );
    report.push({ table: "submissions", rule: "cascade from deleted practice matches", total: null, wouldDelete: sub.rows[0].n });
    return report;
  } finally {
    await client.query("rollback");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;
  if (!url) {
    console.error("Set POSTGRES_URL_NON_POOLING first.");
    process.exit(1);
  }
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: url.replace(/[?&]sslmode=[^&]*/, ""), ssl: { rejectUnauthorized: false } });
  await client.connect();
  const report = await dryRun(client);
  await client.end();
  console.log("DRY RUN — nothing was deleted.\n");
  for (const r of report) {
    console.log(`${r.table.padEnd(12)} ${String(r.wouldDelete ?? "-").padStart(6)} would be deleted${r.total != null ? ` (of ${r.total})` : ""} — ${r.rule}${r.note ? ` [${r.note}]` : ""}`);
  }
}
