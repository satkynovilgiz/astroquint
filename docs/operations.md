# Operations guide

## Environments (current)

| Environment | Database | Notes |
|---|---|---|
| Production (`astroquint.vercel.app`) | Supabase `astroquint-db` (Free plan) | Only the Vercel **Production** environment receives its credentials |
| Local development | In-memory store | `.env.local` has no database credentials |
| Automated tests | In-memory store + **PGlite** for SQL | `playwright.config.ts` blanks Supabase variables; `tests/unit/migrations.test.ts` runs the real migrations in an in-process Postgres |
| Preview deployments | None | Daily/Party show "not connected"; Solo works |

### Isolated local database: options

| Option | What you get | Cost / requirement | Status |
|---|---|---|---|
| **PGlite** (in use) | Real Postgres (WASM) in the test process: migrations, functions, RLS roles, cleanup dry runs | Nothing to install beyond `npm i` | ✅ Used by `tests/unit/migrations.test.ts` |
| **Supabase CLI local stack** (`supabase start`) | Full local Supabase (Postgres + REST + Realtime + Studio), so the app itself can run against a local DB | Requires **Docker** (Docker Desktop, OrbStack or Colima) — not installed on this machine | Ready to set up on approval: install a Docker runtime, then `npx supabase init && npx supabase start`, copy migrations into `supabase/migrations` (already there), and put the printed local URL/keys in `.env.local` |
| Second cloud project (staging) | Hosted Supabase for preview deployments | Free plan allows 2 active projects per owner — the limit is reached; would require pausing/deleting another project or a paid plan | Not pursued (owner decision: keep existing projects untouched, stay on Free) |

## Supabase Free plan: limitations to know

Check Supabase's pricing page for current numbers; at the time of writing the Free plan:

- **No automatic backups you can restore yourself** — use the manual backup below.
- **Pauses inactive projects** after a period without activity; a paused project must be resumed from the dashboard (the site would show "Online play isn't connected yet" for Daily/Party; Solo keeps working).
- Limited database size, bandwidth, and Realtime connections/messages — fine for early testing, to be revisited with real traffic.
- 2 active free projects per owner (why there is no cloud staging project).

## Manual backup (read-only)

1. Get the production connection string **temporarily** (do not save it in `.env.local`):
   ```bash
   vercel env pull /tmp/astroquint-prod.env --environment=production
   ```
2. Export (read-only, repeatable-read snapshot):
   ```bash
   set -a; . /tmp/astroquint-prod.env; set +a
   node scripts/export-db.mjs backups/
   rm /tmp/astroquint-prod.env
   ```
3. The JSON in `backups/` contains player data (display names, game history). Keep it private and encrypted; `backups/` is gitignored. Suggested cadence on Free: weekly, and **always before any migration**.

Restoring from a JSON export is a manual, table-by-table insert (profiles → daily_challenges → matches → submissions → daily_results → player_achievements → rooms). For point-in-time recovery, upgrade to a paid plan.

## Applying migration 0002 (shared rate limiting) — requires approval

Reviewed and tested in isolation (`tests/unit/migrations.test.ts`): applies cleanly, changes no existing rows, is idempotent, blocks only above the per-minute limits, is unreachable for `anon`/`authenticated`, and rolls back cleanly.

Procedure once approved:
1. Manual backup (above).
2. Dry run of current data: `node scripts/cleanup-dry-run.mjs` (read-only).
3. Apply `supabase/migrations/0002_rate_limits.sql` in the Supabase SQL editor (single transaction).
4. Verify: `GET /api/health` is `ok`; Vercel logs show no `[rate-limit]` warnings; play a Solo run.
5. **Rollback** if needed: run `supabase/rollbacks/0002_rate_limits_down.sql`. The app falls back to per-instance limits automatically; no redeploy needed.

## Monitoring (non-destructive)

- `curl https://astroquint.vercel.app/api/health` — mode availability and config checks (no secrets).
- `npm run test:prod` — plays a full Solo game on the live site (writes nothing to the database).
- Vercel runtime logs (errors/warnings) for the project.
- Production write tests (`tests/e2e/prod-online.spec.ts`) are **disabled against production** unless `ALLOW_PROD_WRITES=1` is set explicitly.
