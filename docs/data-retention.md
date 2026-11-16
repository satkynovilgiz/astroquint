# Data retention and cleanup (proposal — NOT enabled)

Status: **draft for the owner's decision.** No automatic deletion is scheduled in production.
`public.astroquint_cleanup()` exists in the database (from `0001_init.sql`) but nothing calls it.
Retention periods below are *proposals* and must be finalised together with the Privacy Policy.

## What Astroquint stores

| Table | What it holds | Personal data? | Created when |
|---|---|---|---|
| `profiles` | Random guest id, display name, created time | Display name (chosen by the player) | First Daily/Party/profile action |
| `matches` | Server-side game state for Daily (ranked + practice) | Linked to a guest id | Starting a Daily run |
| `submissions` | Audit log of each accepted answer | Linked to a guest id | Each Daily answer |
| `daily_challenges` | The 5 question ids per UTC day | No | First Daily request of the day |
| `daily_results` | Ranked score per player per day (leaderboard) | Linked to a guest id + shown with display name | Finishing a ranked Daily run |
| `player_achievements` | Unlocked achievements | Linked to a guest id | Finishing a Daily run |
| `rooms` | Party room state (players' names, answers, scores) | Display names, guest ids (server-only) | Creating a Party room |
| `rate_limits` *(only if migration 0002 is approved)* | Salted one-way hash of IP + counter | Pseudonymous | Expensive API calls |

Solo Orbit stores **nothing** in the database (its state travels in a signed token in the player's browser).

## What the proposed cleanup would delete

| Data | Rule in `astroquint_cleanup()` | Why | Proposed retention | Decision needed |
|---|---|---|---|---|
| Party rooms | `rooms.expires_at < now()` (rooms expire 2 h after last activity) | Rooms are useless after expiry; they contain names and answers | Delete once expired | Confirm |
| Daily **practice** matches | `mode = 'daily-practice'` older than **30 days** | Unranked, never shown on leaderboards | 30 days | Confirm or change |
| Rate-limit counters | `window_start` older than **1 day** (0002 only) | Only needed for the current window | 1 day | Confirm |
| Ranked matches, `submissions`, `daily_results`, `profiles`, achievements | **Not deleted** by the cleanup | Needed for leaderboards, history and fairness audit | *To decide* (e.g. keep while the game runs, delete inactive guests after N months) | **Required for the Privacy Policy** |

Cascades: deleting a practice `match` also deletes its `submissions` rows (`on delete cascade`). Nothing else cascades from the cleanup.

## Dry run (no changes)

`scripts/cleanup-dry-run.mjs` reports **counts** of rows that would match each rule, inside a read-only transaction, without returning any personal data. Run it against an isolated database or (read-only) against production:

```bash
POSTGRES_URL_NON_POOLING="postgres://…" node scripts/cleanup-dry-run.mjs
```

## Before enabling automatic cleanup

1. Owner finalises retention periods (table above) and updates `/privacy`.
2. Review the dry-run output against production.
3. Take a manual backup (`scripts/export-db.mjs`).
4. Only then schedule it, e.g. with pg_cron: `select cron.schedule('astroquint-cleanup', '17 * * * *', 'select public.astroquint_cleanup()');` — requires explicit approval.
