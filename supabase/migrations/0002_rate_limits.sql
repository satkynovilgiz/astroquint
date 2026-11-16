-- Shared rate limiting across serverless instances.
-- Keys are salted hashes of client IPs (never raw IPs). Only the server
-- (service role) can call the function; browsers have no access.

begin;

create table if not exists public.rate_limits (
  key          text primary key,
  window_start timestamptz not null,
  count        integer not null
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

create or replace function public.astroquint_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update set
    count = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.count + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning count into v_count;
  return v_count <= p_max;
end $$;
revoke all on function public.astroquint_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.astroquint_rate_limit(text, integer, integer) to service_role;

-- Stale rate-limit windows are swept by the existing cleanup routine.
create or replace function public.astroquint_cleanup() returns void
language sql security definer set search_path = public as $$
  delete from public.rooms where expires_at < now();
  delete from public.matches where mode = 'daily-practice' and created_at < now() - interval '30 days';
  delete from public.rate_limits where window_start < now() - interval '1 day';
$$;
revoke all on function public.astroquint_cleanup() from public, anon, authenticated;

commit;
