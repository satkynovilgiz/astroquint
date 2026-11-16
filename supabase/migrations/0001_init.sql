-- Astroquint initial schema.
-- All gameplay tables are written exclusively by the server (service role).
-- Row Level Security is enabled everywhere with NO anon/authenticated
-- policies, so browsers cannot read or write these tables directly.

begin;

create table public.profiles (
  id            text primary key check (id ~ '^[a-f0-9]{32}$'),
  display_name  text not null check (char_length(display_name) between 2 and 20),
  created_at    timestamptz not null default now()
);

-- ── Content ───────────────────────────────────────────────────────────────
create table public.question_packs (
  id          text primary key,
  title       text not null,
  category    text not null,
  status      text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  version     integer not null default 1,
  created_at  timestamptz not null default now()
);

create table public.questions (
  id             text primary key check (id ~ '^[a-z]{2}-\d{3}$'),
  pack_id        text not null references public.question_packs (id),
  world_type     text not null check (world_type in ('pattern-break', 'truth-trap', 'timeline', 'geotap', 'final-bet')),
  difficulty     smallint not null check (difficulty between 1 and 3),
  public_content jsonb not null,           -- prompt/options as shown to players
  review_status  text not null check (review_status in ('approved', 'draft', 'rejected')),
  created_at     timestamptz not null default now()
);
create index questions_world_idx on public.questions (world_type) where review_status = 'approved';

-- Private: answers, explanations and sources. Never exposed before reveal.
create table public.question_solutions (
  question_id text primary key references public.questions (id) on delete cascade,
  solution    jsonb not null,
  explanation text not null,
  sources     jsonb not null default '[]'::jsonb
);

-- ── Matches ───────────────────────────────────────────────────────────────
create table public.matches (
  id            text primary key,
  mode          text not null check (mode in ('daily', 'daily-practice')),
  player_id     text not null references public.profiles (id) on delete cascade,
  daily_date    date,
  ranked        boolean not null default false,
  state         jsonb not null,             -- authoritative engine state (rounds, timestamps, reveals)
  version       integer not null default 0, -- optimistic concurrency
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);
create index matches_player_idx on public.matches (player_id, created_at desc);
-- One ranked daily attempt per player per day.
create unique index matches_one_ranked_daily on public.matches (player_id, daily_date) where ranked;

-- Audit log of every accepted answer; PK prevents duplicate scoring.
create table public.submissions (
  match_id     text not null references public.matches (id) on delete cascade,
  round_index  smallint not null check (round_index between 0 and 4),
  player_id    text not null references public.profiles (id) on delete cascade,
  question_id  text not null,
  answer       jsonb not null,
  received_at  timestamptz not null,
  outcome      text not null check (outcome in ('correct', 'incorrect', 'timeout')),
  points       integer not null,
  primary key (match_id, round_index, player_id)
);

-- ── Daily Orbit ───────────────────────────────────────────────────────────
create table public.daily_challenges (
  challenge_date date primary key,
  question_ids   text[] not null check (array_length(question_ids, 1) = 5),
  published      boolean not null default true,
  created_at     timestamptz not null default now()
);

create table public.daily_results (
  challenge_date date not null references public.daily_challenges (challenge_date),
  player_id      text not null references public.profiles (id) on delete cascade,
  match_id       text not null references public.matches (id) on delete cascade,
  score          integer not null check (score >= 0),
  correct        smallint not null check (correct between 0 and 5),
  completed_at   timestamptz not null,
  primary key (challenge_date, player_id)
);
create index daily_results_rank_idx on public.daily_results (challenge_date, score desc, correct desc, completed_at);
create index daily_results_player_idx on public.daily_results (player_id, completed_at desc);

-- ── Achievements ──────────────────────────────────────────────────────────
create table public.achievements (
  id   text primary key,
  name text not null,
  rule text not null
);
insert into public.achievements (id, name, rule) values
  ('planet-hopper',   'Planet Hopper',   'Finish all five worlds in one game.'),
  ('logic-explorer',  'Logic Explorer',  'Solve Pattern Break.'),
  ('timeline-master', 'Timeline Master', 'Get the Timeline order fully right within 10 seconds, with the timer on.'),
  ('high-roller',     'High Roller',     'Bet the maximum 300 points in Final Bet and win.'),
  ('perfect-orbit',   'Perfect Orbit',   'Answer all five worlds correctly.'),
  ('galaxy-genius',   'Galaxy Genius',   'Finish with 1,000 points or more.');

create table public.player_achievements (
  player_id      text not null references public.profiles (id) on delete cascade,
  achievement_id text not null references public.achievements (id),
  match_id       text not null,
  unlocked_at    timestamptz not null default now(),
  primary key (player_id, achievement_id)
);

-- ── Party rooms ───────────────────────────────────────────────────────────
create table public.rooms (
  code        text primary key check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  state       jsonb not null,
  version     integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index rooms_expiry_idx on public.rooms (expires_at);

-- ── Security: deny direct client access ──────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['profiles','question_packs','questions','question_solutions','matches','submissions',
                           'daily_challenges','daily_results','achievements','player_achievements','rooms']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- ── Retention ─────────────────────────────────────────────────────────────
-- Expired party rooms and old practice matches are removed. Schedule with
-- pg_cron if available:  select cron.schedule('astroquint-cleanup', '17 * * * *', 'select public.astroquint_cleanup()');
create or replace function public.astroquint_cleanup() returns void
language sql security definer set search_path = public as $$
  delete from public.rooms where expires_at < now();
  delete from public.matches where mode = 'daily-practice' and created_at < now() - interval '30 days';
$$;
revoke all on function public.astroquint_cleanup() from public, anon, authenticated;

commit;
