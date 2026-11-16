-- Rollback for 0002_rate_limits.sql.
-- Removes only what 0002 added and restores astroquint_cleanup() exactly as
-- defined in 0001_init.sql. Does not touch any player tables.
-- After rolling back, the app automatically falls back to per-instance rate
-- limits (src/server/rate-limit-shared.ts).

begin;

drop function if exists public.astroquint_rate_limit(text, integer, integer);
drop table if exists public.rate_limits;

create or replace function public.astroquint_cleanup() returns void
language sql security definer set search_path = public as $$
  delete from public.rooms where expires_at < now();
  delete from public.matches where mode = 'daily-practice' and created_at < now() - interval '30 days';
$$;
revoke all on function public.astroquint_cleanup() from public, anon, authenticated;

commit;
