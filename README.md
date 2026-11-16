# Astroquint

**Five Worlds. One Brilliant Mind.**

Astroquint is a browser puzzle and knowledge game. Each 2–4 minute game travels through five worlds, and each one tests a different kind of thinking:

| # | World | Mechanic | Timer |
|---|-------|----------|-------|
| 01 | **Pattern Break** | Find the rule in a sequence and pick what comes next (4 options) | 20 s |
| 02 | **Truth Trap** | Three statements, one false: find the lie | 20 s |
| 03 | **Timeline** | Drag (or use the arrow buttons) to put events in chronological order | 20 s |
| 04 | **GeoTap** | Tap the right country on an interactive world map | 25 s |
| 05 | **Final Bet** | Wager up to 300 points, then answer the toughest question | 20 s |

**Modes:**
- **Solo Orbit:** no account needed, with an optional relaxed mode that has no timer.
- **Daily Orbit:** everyone gets the same questions, with one ranked attempt per UTC day, a leaderboard, and practice replays.
- **Party Mode:** a private real-time room for 2–8 players.

## Quick start

```bash
npm install
cp .env.example .env.local
# put a random 32+ char value in SESSION_SECRET, e.g.:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm run dev            # → http://localhost:3000
```

Everything, including ranked Daily Orbit and multiplayer Party Mode, works locally **without any external service**. Without Supabase variables, data lives in server memory and resets when the server restarts.

### Scripts

| Script | |
|--------|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve (needs `SESSION_SECRET`) |
| `npm run lint` | ESLint (Next.js + React Compiler rules) |
| `npm run typecheck` | Route typegen + `tsc --noEmit` (strict) |
| `npm test` | Vitest: 166 unit/component tests |
| `npm run test:e2e` | Playwright: 127 browser tests against the production build (`npm run build` first; first run: `npx playwright install chromium`) |
| `npm run check` | lint → typecheck → test → build |
| `npm run build:map` | Regenerate GeoTap map paths from Natural Earth data |

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `SESSION_SECRET` | **Production: yes** | HMAC key for guest-session cookies and Solo state tokens (32+ chars). Dev falls back to a random per-process key. |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Absolute URL for metadata, Open Graph and the sitemap |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Turns on the Supabase store and Realtime |
| `SUPABASE_SERVICE_ROLE_KEY` | With Supabase | **Server-only**. Never prefix it with `NEXT_PUBLIC_` and never commit it. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | With Supabase | Lets browsers subscribe to Realtime *broadcast* channels (it gives no table access) |

## Production status check

`GET /api/health` reports which modes this deployment can serve and why. It never includes secret values:

```json
{ "ok": false, "modes": { "solo": true, "daily": false, "party": false },
  "checks": { "sessionSecret": "set", "storage": "not_configured", "database": "not_configured", "realtime": "sse" } }
```

- `sessionSecret: "missing"`: Solo, Daily and Party all return HTTP 503 `session_secret_missing`. Players see "Games are temporarily unavailable".
- `storage: "not_configured"`: Daily and Party return 503 `storage_not_configured`. Players see an honest "Online play isn't connected yet" message with a link to Solo.

Every API error includes a `code` and the Vercel request id. The UI shows them as a small "Ref", so a player's report can be matched to a line in Vercel's runtime logs.

## Deploying (Vercel + Supabase)

1. **Supabase:** create a project, then run `supabase/migrations/0001_init.sql` (SQL editor or `supabase db push`). If you have pg_cron, schedule the cleanup with `select cron.schedule('astroquint-cleanup', '17 * * * *', 'select public.astroquint_cleanup()');`.
2. **Vercel:** import the GitHub repository (Next.js preset) and set the environment variables above for Production and Preview. Use a different `SESSION_SECRET` per environment.
3. **Deploy**, then smoke-test: play a Solo run, play a ranked Daily Orbit, check it appears on `/leaderboard`, and run a two-device Party match.
4. **Before going public:** complete and legally review `/privacy` and `/terms`. Both are clearly marked templates.

> ⚠️ **Not verified against a live Supabase project.** No credentials were available while building, so the Supabase store and the Realtime broadcast adapter (`src/server/store/supabase.ts`, `src/server/realtime.ts`) were written against the migration's schema and the documented APIs, but never run. All automated tests use the memory store. Test against a staging project first.
>
> **Without Supabase on Vercel**, Solo still works because its state travels in a signed token. Daily and Party need shared storage: the memory store isn't shared between serverless instances. Use Supabase, or a single long-running Node server (`npm start`).

## Architecture

```
src/
  app/                 routes + API route handlers (/api/solo, /api/daily, /api/matches, /api/party, /api/profile, /api/leaderboard)
  components/          UI: animations/, game/, worlds/, party/, daily/, leaderboard/, profile/, layout/, ui/
  features/            framework-free domain logic
    gameplay/          engine.ts (pure state machine), view.ts, summary.ts, client controllers
    party/             engine.ts (pure, time-driven room machine), client hook
    questions/         types, Zod schema, bank loader, deterministic presentation/evaluation, selection
    scoring/ achievements/ worlds/ daily/ share/ audio/ preferences/
  server/              server-only: sessions, store (memory | supabase), games, daily, party, solo tokens, realtime, rate limits
content/questions/     73 approved questions (JSON, one file per world)
supabase/migrations/   schema, constraints, RLS
tests/unit, tests/e2e
```

The **same pure engine** runs every mode. React components only see a `GameView` view model, which never contains unrevealed answers, and send *intents* such as begin, submit or lock wager. The server decides everything else.

## Security model

- **Answers never reach the browser before reveal.** The question bank is imported only by server code. A build check confirmed that explanations and answer keys are absent from `.next/static`. Solo also runs on the server, with its state carried in an HMAC-signed token.
- **Server time and server scoring.** Deadlines and speed bonuses come from server timestamps, with a 400 ms network grace. Early timeouts are refused and late answers count as timeouts.
- **No double scoring.** All writes use compare-and-swap versions. A unique `(match, round, player)` audit row and engine phase checks make duplicate or concurrent submissions no-ops.
- **One ranked attempt per day.** The ranked match id is deterministic per player and day (plus a partial unique index in Postgres). Practice is separate.
- **Identity:** an anonymous guest id lives in a signed, HttpOnly, SameSite=Lax cookie. Clearing cookies creates a new guest, so anonymous play can't be made fully abuse-proof. Rate limits are per IP and per instance.
- **Input validation:** Zod at every API boundary, a body-size cap, validated display names (rendered as text, never HTML), and room codes without look-alike characters from a crypto RNG.
- **Database:** RLS is enabled on every table with no grants to `anon` or `authenticated`. The service role is used only on the server. Solutions sit in a separate private table.
- **Headers:** nosniff, `X-Frame-Options: DENY` plus `frame-ancestors 'none'`, Referrer-Policy, Permissions-Policy and HSTS. *A full script CSP is not enabled yet:* it needs per-request nonces, which conflicts with the static prerendering used here.

## Themes

- **Dark is the default:** deep charcoal (`#12141D`) with a purple-blue undertone. **Light** is soft pearl (`#F1F1F6`). Players switch with the sun/moon button in the header or the switch in the menu, and the choice is saved per device.
- **Tokens:** the theme's raw values live in `src/app/globals.css` (`:root[data-theme=…]`). Tailwind utilities read them through `@theme inline`, so switching themes needs no rebuild.
- **No flash:** an inline head script applies the saved theme before first paint.
- **Contrast is tested:** `tests/unit/worlds.test.ts` parses the token values and asserts WCAG AA for text and accents on every surface, in both themes. Light mode deepens the lime, violet, gold and teal accents so they stay readable.

## Motion and accessibility

- **Motion tokens** (`src/lib/motion/tokens.ts`, mirrored as CSS variables) cover durations, easing curves and springs.
- **Hover feedback** uses scale rather than translation, which avoids hover-jitter loops.
- **Continuous animation** (canvas starfield with shooting stars and sprite-cached dust, orbit system with moon) uses one rAF loop, pauses when the tab is hidden, and scales particle counts with the device.
- **Compositor-friendly effects:** the aurora border on key buttons rotates a pre-rasterised gradient with `transform`. Animating a CSS custom property instead cost about 18% of the main thread in measurements.
- **Reduced motion:** the OS setting *or* the in-game switch freezes loops and turns off view-transition and CSS animation.
- **Accessibility:**
  - Keyboard play everywhere: A–D or 1–4 to answer, Alt+↑/↓ in Timeline, arrow keys on the map.
  - Every drag action has a button alternative.
  - Visible focus states, a skip link and live regions for timers and scores.
  - Native `<dialog>` menus.
  - Relaxed (untimed) mode.
- **Automated a11y checks:** axe-core runs in e2e over every page plus in-game, reveal and menu states, with zero WCAG 2.2 AA violations at the time of writing.

### Measured performance

Measured with the production build at 390px width, 4× CPU throttle, locally served (no network throttling):

| Page | FCP | LCP | CLS | Animation |
|------|-----|-----|-----|-----------|
| `/` | 172 ms | **252 ms** | 0 | 61 fps |
| `/play` | 124 ms | 124 ms | 0 | 61 fps |
| `/play/solo` | 124 ms | 1352 ms | 0.013 | 61 fps |

These are lab numbers from one machine. Measure field data after deploying, for example with Vercel Speed Insights.

## Question bank

There are 73 approved questions in `content/questions/*.json`, and each one is validated by `tests/unit/question-bank.test.ts`. To add questions, append to the JSON and run `npm test`; no UI changes are needed. Every factual statement or event cites an https source. Pattern questions are pure arithmetic or logic.

**Review status:** "approved" means the questions were chosen to be well established and checked editorially against the cited reference. They have *not* had an independent human fact-check yet, which is recommended before launch.

GeoTap uses public-domain Natural Earth 1:110m boundaries (via `world-atlas`), pre-projected at build time.

## Known limitations

- Supabase and Realtime adapters are untested against a live project (see Deploying).
- Rate limits are per server instance.
- Party games and Solo runs don't appear on profiles; only Daily games do.
- Guest identity is device-bound. Accounts with Supabase Auth would be a natural next step.
- No full script CSP yet (needs nonces).
- Sounds are synthesised in code, so there are no audio files and nothing to license.

## Licence and assets

All artwork is original SVG, CSS or Canvas. Map data is from Natural Earth (public domain). Fonts are Space Grotesk and Inter (SIL Open Font License), served through `next/font`.
