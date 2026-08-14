-- ---------------------------------------------------------------------------
-- The 36-hour clock, for people who are not signed in.
-- ---------------------------------------------------------------------------
--
-- The public homepage shows the countdown, so the read has to work for `anon`.
-- This is a SEPARATE, NARROWER function rather than opening up
-- hackathon_state(): that one also returns started_by_name, the full name of
-- the staff account that pressed the button, which has no business being on a
-- page the whole internet can load. The coordinator's name IS public — it is
-- on the projector in front of the hall — so it stays.
--
-- No started_at either. A visitor needs to know how long is left, not when the
-- room started working.
-- ---------------------------------------------------------------------------

create or replace function public.hackathon_public()
returns table (
  status text,
  ends_at timestamptz,
  duration_seconds integer,
  coordinator_name text,
  coordinator_title text,
  server_now timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when s.hack_started_at is null then 'idle'
      when s.hack_ends_at is not null and now() >= s.hack_ends_at then 'finished'
      else 'running'
    end,
    s.hack_ends_at,
    s.hack_duration_seconds,
    s.hack_coordinator_name,
    s.hack_coordinator_title,
    now()
  from public.event_settings s
  where s.id;
$$;

-- Deliberately granted to anon as well: this is the one hackathon read that is
-- meant to be world-readable.
revoke all on function public.hackathon_public() from public;
grant execute on function public.hackathon_public() to anon, authenticated;
