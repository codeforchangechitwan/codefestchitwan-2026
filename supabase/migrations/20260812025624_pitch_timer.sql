-- ---------------------------------------------------------------------------
-- Pitch timer — 12 August 2026
--
-- State lives on the existing singleton event_settings row, the same lever
-- table submissions_are_open() reads. No new table, no new RLS dialect.
--
-- The state machine is three columns and NO ticking process:
--   pitch_ends_at is null   -> idle
--   pitch_paused_at not null -> paused, remaining = ends_at - paused_at
--   otherwise                -> running, remaining = ends_at - now()
-- Resume shifts ends_at forward by the length of the pause. Same
-- absolute-server-deadline principle as the quiz timer.
-- ---------------------------------------------------------------------------

alter table public.event_settings
  add column if not exists pitch_team_id uuid references public.teams (id) on delete set null,
  add column if not exists pitch_label text,
  add column if not exists pitch_duration_seconds integer not null default 300,
  add column if not exists pitch_started_at timestamptz,
  add column if not exists pitch_ends_at timestamptz,
  add column if not exists pitch_paused_at timestamptz,
  add column if not exists pitch_updated_at timestamptz;

-- Read by every phone in the hall via /api/pitch, so it is one cheap query.
--
-- server_now is the load-bearing field: each client measures its own clock
-- skew once and then runs a smooth local countdown between polls. Phones with
-- wrong clocks are common enough that omitting it would bite.
--
-- remaining_seconds is SIGNED on purpose — overtime counts up in red rather
-- than blanking, because "enforce nothing" applies to the stage too.
create or replace function public.pitch_state()
returns table (
  status text,
  team_id uuid,
  team_code text,
  team_name text,
  pitch_order integer,
  label text,
  duration_seconds integer,
  ends_at timestamptz,
  paused_at timestamptz,
  remaining_seconds integer,
  server_now timestamptz,
  next_team_code text,
  next_team_name text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when s.pitch_ends_at is null then 'idle'
      when s.pitch_paused_at is not null then 'paused'
      else 'running'
    end,
    t.id, t.code, t.name, t.pitch_order,
    s.pitch_label,
    s.pitch_duration_seconds,
    s.pitch_ends_at,
    s.pitch_paused_at,
    case
      when s.pitch_ends_at is null then null
      else floor(extract(epoch from
        s.pitch_ends_at - coalesce(s.pitch_paused_at, now())))::integer
    end,
    now(),
    nx.code, nx.name,
    s.pitch_updated_at
  from public.event_settings s
  left join public.teams t on t.id = s.pitch_team_id
  left join lateral (
    select t2.code, t2.name from public.teams t2
    where t2.pitch_order is not null
      and t2.pitch_order > coalesce(t.pitch_order, 0)
    order by t2.pitch_order limit 1
  ) nx on true
  where s.id and auth.uid() is not null;
$$;

-- Every instant is computed from the DATABASE clock. setSubmissionWindow sends
-- a client-computed ISO string, but that is a human-entered wall-clock
-- deadline; a five-minute stage clock must not inherit the laptop's skew.
create or replace function public.set_pitch(
  action text,
  target_team uuid default null,
  seconds integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.event_settings;
  span integer;
  nxt uuid;
begin
  if not public.is_executive() then
    raise exception 'only executives can drive the pitch timer';
  end if;

  select * into s from public.event_settings where id;

  if action = 'start' then
    span := greatest(coalesce(seconds, s.pitch_duration_seconds), 10);
    update public.event_settings set
      pitch_team_id = coalesce(target_team, pitch_team_id),
      pitch_duration_seconds = span,
      pitch_started_at = now(),
      pitch_ends_at = now() + make_interval(secs => span),
      pitch_paused_at = null,
      pitch_updated_at = now(), updated_by = auth.uid()
    where id;

  elsif action = 'next' then
    select t.id into nxt from public.teams t
      where t.pitch_order is not null
        and t.pitch_order > coalesce(
              (select t0.pitch_order from public.teams t0 where t0.id = s.pitch_team_id), 0)
      order by t.pitch_order limit 1;
    if nxt is null then
      raise exception 'that was the last team on the board';
    end if;
    span := greatest(coalesce(seconds, s.pitch_duration_seconds), 10);
    update public.event_settings set
      pitch_team_id = nxt,
      pitch_duration_seconds = span,
      pitch_started_at = now(),
      pitch_ends_at = now() + make_interval(secs => span),
      pitch_paused_at = null,
      pitch_updated_at = now(), updated_by = auth.uid()
    where id;

  elsif action = 'pause' then
    update public.event_settings set
      pitch_paused_at = now(), pitch_updated_at = now(), updated_by = auth.uid()
    where id and pitch_ends_at is not null and pitch_paused_at is null;

  elsif action = 'resume' then
    update public.event_settings set
      pitch_ends_at = pitch_ends_at + (now() - pitch_paused_at),
      pitch_paused_at = null, pitch_updated_at = now(), updated_by = auth.uid()
    where id and pitch_paused_at is not null;

  elsif action = 'extend' then
    update public.event_settings set
      pitch_ends_at = coalesce(pitch_ends_at, now()) + make_interval(secs => coalesce(seconds, 60)),
      pitch_updated_at = now(), updated_by = auth.uid()
    where id;

  elsif action = 'stop' then
    update public.event_settings set
      pitch_ends_at = null, pitch_paused_at = null, pitch_started_at = null,
      pitch_updated_at = now(), updated_by = auth.uid()
    where id;

  else
    raise exception 'unknown pitch action';
  end if;
end;
$$;

revoke all on function public.pitch_state() from public, anon;
revoke all on function public.set_pitch(text, uuid, integer) from public, anon;
grant execute on function public.pitch_state() to authenticated;
grant execute on function public.set_pitch(text, uuid, integer) to authenticated;
