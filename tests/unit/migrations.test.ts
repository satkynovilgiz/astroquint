// @vitest-environment node
/**
 * Isolated database tests: the real migrations run against PGlite (Postgres
 * compiled to WebAssembly, in-process). No Docker, no network, and no access
 * to any Supabase project — production is never involved.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { dryRun } from "../../scripts/cleanup-dry-run.mjs";

const sql = (p: string) => readFileSync(resolve(__dirname, "../../supabase", p), "utf8");
const DATA_TABLES = ["profiles", "matches", "submissions", "daily_challenges", "daily_results", "player_achievements", "rooms", "achievements"];

/** Supabase's built-in roles, so the migrations' GRANT/REVOKE statements work. */
const SUPABASE_ROLES = `
  do $$ begin
    if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
    if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
    if not exists (select from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
  end $$;`;

/** Synthetic, clearly fake data covering every table and every cleanup rule. */
const SEED = `
  insert into profiles (id, display_name, created_at) values
    ('${"a".repeat(32)}', 'Test Pilot A', now() - interval '60 days'),
    ('${"b".repeat(32)}', 'Test Pilot B', now() - interval '2 days');
  insert into daily_challenges (challenge_date, question_ids) values
    (current_date, array['pb-001','tt-001','tl-001','gt-001','fb-001']),
    (current_date - 45, array['pb-002','tt-002','tl-002','gt-002','fb-002']);
  insert into matches (id, mode, player_id, daily_date, ranked, state, version, created_at, completed_at) values
    ('d-ranked-old', 'daily', '${"a".repeat(32)}', current_date - 45, true, '{"v":1}', 3, now() - interval '45 days', now() - interval '45 days'),
    ('p-practice-old', 'daily-practice', '${"a".repeat(32)}', current_date - 45, false, '{"v":1}', 2, now() - interval '45 days', null),
    ('p-practice-new', 'daily-practice', '${"b".repeat(32)}', current_date, false, '{"v":1}', 1, now() - interval '1 day', null);
  insert into submissions (match_id, round_index, player_id, question_id, answer, received_at, outcome, points) values
    ('p-practice-old', 0, '${"a".repeat(32)}', 'pb-002', '{"kind":"choice","index":1}', now() - interval '45 days', 'correct', 150),
    ('d-ranked-old', 0, '${"a".repeat(32)}', 'pb-002', '{"kind":"choice","index":1}', now() - interval '45 days', 'correct', 180);
  insert into daily_results (challenge_date, player_id, match_id, score, correct, completed_at) values
    (current_date - 45, '${"a".repeat(32)}', 'd-ranked-old', 640, 4, now() - interval '45 days');
  insert into player_achievements (player_id, achievement_id, match_id) values ('${"a".repeat(32)}', 'planet-hopper', 'd-ranked-old');
  insert into rooms (code, state, version, expires_at) values
    ('ABCDEF', '{"players":[]}', 0, now() - interval '1 hour'),
    ('GHJKLM', '{"players":[]}', 0, now() + interval '1 hour');`;

async function snapshot(db: PGlite) {
  const out: Record<string, unknown> = {};
  for (const t of DATA_TABLES) {
    const r = await db.query<{ j: unknown }>(`select coalesce(json_agg(t order by t::text), '[]') as j from public.${t} t`);
    out[t] = r.rows[0].j;
  }
  return JSON.stringify(out);
}

const allow = async (db: PGlite, key: string, max = 3, windowSeconds = 60) =>
  (await db.query<{ ok: boolean }>("select public.astroquint_rate_limit($1, $2, $3) as ok", [key, max, windowSeconds])).rows[0].ok;

describe("migrations in an isolated Postgres (PGlite)", () => {
  let db: PGlite;
  let before: string;

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(SUPABASE_ROLES);
    await db.exec(sql("migrations/0001_init.sql"));
    await db.exec(SEED);
    before = await snapshot(db);
  }, 60_000);

  it("0002 applies cleanly and leaves every existing row unchanged", async () => {
    await db.exec(sql("migrations/0002_rate_limits.sql"));
    expect(await snapshot(db)).toBe(before);
    const rl = await db.query<{ n: number }>("select count(*)::int as n from public.rate_limits");
    expect(rl.rows[0].n).toBe(0);
  });

  it("is idempotent (re-applying 0002 is harmless)", async () => {
    await db.exec(sql("migrations/0002_rate_limits.sql"));
    expect(await snapshot(db)).toBe(before);
  });

  it("allows up to the limit, blocks only beyond it, and keys are independent", async () => {
    expect([await allow(db, "k1"), await allow(db, "k1"), await allow(db, "k1")]).toEqual([true, true, true]);
    expect(await allow(db, "k1")).toBe(false);
    expect(await allow(db, "k2")).toBe(true); // another player/IP is unaffected
  });

  it("resets after the window, so blocked players recover", async () => {
    await db.exec("update public.rate_limits set window_start = now() - interval '2 minutes' where key = 'k1'");
    expect(await allow(db, "k1")).toBe(true);
  });

  it("does not block legitimate play at the production thresholds", async () => {
    // Production limits (src/app/api/*): create room 10/min, start Daily 15/min, rename 10/min, session 20/min.
    // A very active real player: 3 rooms, 4 Daily starts, 2 renames and 5 session checks in one minute.
    const plan: [string, number, number][] = [["party-create", 10, 3], ["daily-start", 15, 4], ["profile-write", 10, 2], ["session", 20, 5]];
    for (const [bucket, max, uses] of plan) {
      for (let i = 0; i < uses; i++) expect(await allow(db, `${bucket}:player`, max)).toBe(true);
    }
  });

  it("keeps the rate-limit table and function out of reach of public roles", async () => {
    await db.exec("set role anon");
    await expect(db.query("select * from public.rate_limits")).rejects.toThrow(/permission denied/);
    await expect(db.query("select public.astroquint_rate_limit('x', 1, 60)")).rejects.toThrow(/permission denied/);
    await db.exec("reset role");
  });

  it("dry-run cleanup reports exactly what would be deleted — and deletes nothing", async () => {
    await db.exec("update public.rate_limits set window_start = now() - interval '3 days' where key = 'k2'");
    const beforeDry = await snapshot(db);
    const report = (await dryRun(db)) as { table: string; wouldDelete: number | null }[];
    const by = Object.fromEntries(report.map((r) => [r.table, r.wouldDelete]));
    expect(by).toMatchObject({ rooms: 1, matches: 1, rate_limits: 1, submissions: 1 });
    expect(await snapshot(db)).toBe(beforeDry);
  });

  it("dry-run refuses to write even if asked to (read-only transaction)", async () => {
    await db.exec("begin transaction read only");
    await expect(db.exec("delete from public.rooms")).rejects.toThrow(/read-only/);
    await db.exec("rollback");
  });

  it("rollback removes only what 0002 added and restores the original cleanup function", async () => {
    await db.exec(sql("rollbacks/0002_rate_limits_down.sql"));
    const reg = await db.query<{ t: string | null }>("select to_regclass('public.rate_limits')::text as t");
    expect(reg.rows[0].t).toBeNull();
    const fn = await db.query<{ n: number }>("select count(*)::int as n from pg_proc where proname = 'astroquint_rate_limit'");
    expect(fn.rows[0].n).toBe(0);
    const def = await db.query<{ src: string }>("select prosrc as src from pg_proc where proname = 'astroquint_cleanup'");
    expect(def.rows[0].src).not.toContain("rate_limits");
    expect(await snapshot(db)).toBe(before);
    // And the migration can be re-applied after a rollback.
    await db.exec(sql("migrations/0002_rate_limits.sql"));
    expect(await snapshot(db)).toBe(before);
  });
});
