# Astroquint

**Five Worlds. One Brilliant Mind.**

Astroquint is a browser puzzle and knowledge game. Each game is a short trip through five worlds, and each world tests a different kind of thinking:

| # | World | Skill | Timer |
|---|-------|-------|-------|
| 01 | Pattern Break | Logic & patterns | 20 s |
| 02 | Truth Trap | Spot the one false fact | 20 s |
| 03 | Timeline | Put events in chronological order | 20 s |
| 04 | GeoTap | Find the country on a map | 25 s |
| 05 | Final Bet | Wager up to 300 points on a final question | 20 s |

Modes: **Solo Orbit** (no account), **Daily Orbit** (the same questions for everyone, one ranked attempt per UTC day) and **Party Mode** (private rooms for 2–8 players with synchronized rounds).

## Status

| Milestone | Scope | State |
|-----------|-------|-------|
| 1 | Foundation, design system, motion system, homepage, mode select | ✅ Done |
| 2 | Full five-world solo game, question bank, planet travel, results | ✅ Done |
| 3 | Server-side scoring, Daily Orbit, leaderboards, profiles, achievements, share cards | ✅ Done (memory store; Supabase adapter ready) |
| 4 | Real-time Party Mode | ✅ Done (SSE locally; Supabase Realtime adapter ready) |
| 5 | Polish, audio, accessibility review, production readiness | — |


## Question bank

Questions live in `content/questions/*.json`, one file per world. There are 73 approved questions (18 Pattern Break, 11 Truth Trap, 10 Timeline, 23 GeoTap, 11 Final Bet).

- **Schema:** each question is validated against `src/features/questions/schema.ts` by `tests/unit/question-bank.test.ts`. The checks cover IDs, option counts, exactly one false statement, distinct event years, GeoTap countries that exist on the map, and https sources.
- **Adding questions:** append to the JSON file and run `npm test`. No UI code changes are needed.
- **Review status:** only questions with `review.status = "approved"` are ever served. Every factual statement, event and answer cites a reference. Pattern questions are pure arithmetic or logic.
- **What "approved" means:** the facts were chosen to be well established and checked editorially against the cited reference. They have **not** been through a separate human fact-check. That's recommended before a public launch.
- **No answer leaks:** the public question shown to a player never contains the answer (enforced by a test). Option and event order is shuffled deterministically per game seed.
- **Map data:** GeoTap uses Natural Earth 1:110m country boundaries, which are public domain (via `world-atlas`). They are projected at build time into `src/features/geo/world-map.json` with `npm run build:map`.

## Server-authoritative play (Daily Orbit)

- **Identity:** guests get a random id in a signed, HttpOnly cookie. No account is needed. Clearing cookies creates a new guest, so anonymous play can't be made fully abuse-proof. The one-attempt rule is enforced per guest identity, and starting a game is rate-limited per IP.
- **Server-run rules:** the server runs the same pure engine as Solo and records start times, deadlines and answers with its own clock. Clients only send intents (begin / lock wager / submit / timeout / continue). Speed bonuses come from server timestamps, with a 400 ms grace for network delay.
- **No double scoring:** concurrent requests are serialised with compare-and-swap versions. Each round's answer is stored once in an audit table keyed by (match, round, player).
- **Daily questions:** they're chosen deterministically per UTC day and frozen in `daily_challenges` on first use. Everyone gets the same questions in the same order. The ranked match id is deterministic per player and day, so there's exactly one ranked attempt (resumable). Practice runs are separate and never ranked.
- **No leaks:** solutions are never sent before a round is locked. Public result pages (`/results/[id]`) show only scores and outcomes, not question content, so sharing can't spoil the day's Daily Orbit.

## Party Mode

- **Rooms:** 2–8 players. Codes are 6 characters from an alphabet without look-alikes (no I, O, 0 or 1), generated with a cryptographic RNG, and rooms expire after 2 hours of inactivity. Players join by link or code. The host controls start, skip, kick and rematch, and everyone else marks themselves ready.
- **Server-authoritative:** the room is a pure, time-driven state machine (`src/features/party/engine.ts`). Every phase boundary comes from the schedule, not from whoever polls first, and any request advances the room identically. So no background timers are needed, even on serverless. Answers are scored with server timestamps and stored once per player per round. Writes use compare-and-swap with jittered retries, sized so a burst of 8 simultaneous answers always lands.
- **Live updates:** server-sent events (`/api/party/[code]/events`) locally and on single-server hosting. When Supabase is configured, the server publishes Realtime *broadcast* messages and clients subscribe with the anon key. Messages only say "the room changed", so clients always re-fetch the authoritative state. Clients also poll every 2.5 s, which doubles as presence and covers missed pushes.
- **Presence and reconnecting:** a player counts as offline after 15 s without contact. Rounds don't wait for offline players, and if the host is gone for 30 s the longest-standing connected player becomes host. Reloading or reconnecting keeps your seat, because the seat is tied to the signed session cookie.
- **Early phases:** a round reveals as soon as everyone connected has answered, and the final question starts as soon as everyone has locked a wager.
- **Limitations:** SSE plus the memory store need a single server process. For multi-instance production, configure Supabase (database and Realtime). Party games aren't added to profiles or leaderboards.

## Tech stack

- **Next.js 16** (App Router, Cache Components, React 19.3 `<ViewTransition>`), **TypeScript** (strict)
- **Tailwind CSS v4**: design tokens live in `src/app/globals.css` under `@theme`
- **Motion for React** (`motion/react`) for UI motion; CSS keyframes and SVG for ambient motion; **Canvas** only for the starfield
- **Lucide** icons, **Zod** (validation, used from Milestone 2)
- **Vitest** + Testing Library for unit/component tests, **Playwright** for end-to-end tests
- Planned: **Supabase** (Postgres, Auth, Realtime, RLS), hosted on **Vercel**

## Getting started

```bash
npm install
cp .env.example .env.local   # then set SESSION_SECRET (see below)
npm run dev                  # http://localhost:3000
```

`SESSION_SECRET` (32+ random characters) signs guest-session cookies. It's **required** for `npm start` and in production. `npm run dev` falls back to a random per-process secret. To generate one: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

### Storage: memory by default, Supabase when configured

Ranked play, leaderboards and profiles go through a storage interface (`src/server/store`):

- **No Supabase variables set:** an **in-memory store** is used. Everything works locally, but data resets when the server restarts, and it can't be shared across serverless instances. The Daily page shows a note when this mode is active.
- **`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set:** the **Supabase store** is used. Apply `supabase/migrations/0001_init.sql` first. That migration enables RLS on every table and grants nothing to `anon` or `authenticated`. Browsers never touch the database directly; all access goes through the server API.

⚠️ The Supabase adapter matches the migration's schema, but it hasn't been run against a live project in this repo because no credentials were available. Test it against a staging project before launch.

### Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest unit + component tests |
| `npm run test:e2e` | Playwright tests against the production build (run `npm run build` first; first time: `npx playwright install chromium`) |
| `npm run check` | lint → typecheck → test → build |

## Project structure

```
src/
  app/                    routes (/, /play, /how-to-play, /play/solo, /daily, /party, /leaderboard, /profile), metadata, OG image
  components/
    animations/           starfield (canvas), planet (SVG), orbit system, ship, asteroids, warp bus
    brand/                logo + brand palette
    home/                 hero, launch sequence, worlds preview
    layout/               header, footer, providers, page transitions, status screens
    play/                 game-mode selection + mode illustrations
    ui/                   Button/ButtonLink, Card, Dialog (native <dialog>), Switch
  features/
    worlds/               the five world definitions (single source of truth)
    scoring/              deterministic scoring + Final Bet rules (pure functions)
    daily/                UTC day keys and countdowns
    preferences/          per-device sound / motion preferences
    audio/                original Web Audio synth sounds (no audio files)
  hooks/                  media queries, reduced motion, page visibility, clock, scroll
  lib/                    site config, motion tokens, utilities
tests/
  unit/                   Vitest
  e2e/                    Playwright
```

Game rules (`features/`) don't depend on React. The server will run the same scoring functions in Milestone 3, so the client never decides competitive scores.

## Motion system

All timing comes from `src/lib/motion/tokens.ts`, mirrored as CSS variables in `globals.css`:

- **Durations:** instant 100 ms · fast 150 ms · base 250 ms · slow 450 ms · scene 700 ms
- **Easing:** `arrive` (entrances), `depart` (exits, always faster than entrances), `move` (on-screen moves)
- **Springs:** `press` (buttons), `settle` (cards), `float` (pointer parallax)

What runs today:

- **Starfield:** a canvas with depth layers, pointer and scroll parallax, and a warp mode where stars stream past (`requestWarp()`). Planet travel will reuse it in Milestone 2.
- **Orbit system:** a lit, ringed home planet with the five worlds on a tilted orbit. Worlds are depth-sorted every frame so they pass behind and in front of the core. One rAF loop writes transforms directly, with no React re-renders.
- **Launch:** "Start Playing" triggers warp, a bloom and a `warp` view transition into mode select. It takes about 0.65 s and any click skips it.
- **Page transitions:** React `<ViewTransition>` with `nav-forward`, `nav-back` and `warp` types. The header stays anchored.
- **Micro-interactions:** spring press/hover on buttons and cards, an animated nav indicator, a sound toggle and switches.

Performance and accessibility:

- Animations use transform and opacity only.
- The starfield's star count scales with screen size and device capability.
- Loops pause when the tab is hidden, and listeners and frames are cleaned up on unmount.
- **Reduced motion** follows the OS setting *or* the in-game "Reduce motion" switch (menu and footer). It freezes loops, draws one static starfield frame, and turns off CSS and view-transition animation.

## Testing

- **Unit (31):** scoring (speed bonus, timeouts, wager limits, the no-negative rule), world config including WCAG contrast of world label colours, UTC rollover, starfield and orbit maths, the preferences store, header/menu/mode-select/world-preview components.
- **E2E (73):** every page at 320, 375, 390, 414, 768, 1024 and 1440 px with no horizontal scrolling; touch targets ≥ 44 px; orbit animates normally and stays still under reduced motion; launch navigation; mobile menu, Escape and saved preferences; skip link; keyboard activation of mode cards; 404.

## Deployment (planned)

The app targets Vercel and has no environment requirements until Milestone 3. Supabase setup, migrations and RLS policies will be documented when Milestone 3 lands.

## Content & legal

All artwork is original SVG/CSS, and all sounds are synthesised at runtime. Privacy and terms pages will be added as clearly marked templates in Milestone 5 for legal review. They are not final policies.
