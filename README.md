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
| 2 | Full five-world solo game, question bank, planet travel, results | ⏳ Next |
| 3 | Supabase, server-side scoring, Daily Orbit, leaderboards, profiles | Needs Supabase credentials |
| 4 | Real-time Party Mode | Needs Supabase |
| 5 | Polish, audio, accessibility review, production readiness | — |

Pages for features that aren't built yet (`/play/solo`, `/daily`, `/party`, `/leaderboard`, `/profile`) say so plainly and name the milestone that delivers them. Nothing on them is simulated.

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
cp .env.example .env.local   # optional for now: no secrets needed until Milestone 3
npm run dev                  # http://localhost:3000
```

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
