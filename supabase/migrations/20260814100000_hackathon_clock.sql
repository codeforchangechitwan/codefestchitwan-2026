-- ---------------------------------------------------------------------------
-- The 36-hour hackathon clock — 14 August 2026, event morning.
-- ---------------------------------------------------------------------------
--
-- One clock, started once, watched by every device in the building for the
-- next day and a half. It goes on the same singleton row as the pitch timer
-- and the ribbon, which buys three things without writing any of them:
-- event_settings' RLS, the `event` pulse trigger (so a start reaches every
-- phone the instant it happens), and the existing "only executives may write
-- settings" story.
--
-- WHY AN ABSOLUTE ends_at AND NOT started_at + duration ON READ
--
-- The end instant is decided ONCE, by Postgres, when the coordinator presses
-- start. Every later read compares against that stored timestamp. If the end
-- were recomputed from a duration on every read, then editing the duration
-- mid-event — which is exactly what "give them another twenty minutes" means —
-- would silently move a deadline that teams have been pacing against for
-- thirty hours. Storing the instant makes an extension deliberate and visible.
--
-- duration_seconds is kept anyway, as the length the NEXT start will use.
-- ---------------------------------------------------------------------------

alter table public.event_settings
  add column if not exists hack_started_at timestamptz,
  add column if not exists hack_ends_at timestamptz,
  add column if not exists hack_duration_seconds integer not null default 129600,
  add column if not exists hack_started_by uuid references auth.users (id) on delete set null,
  add column if not exists hack_coordinator_name text,
  add column if not exists hack_coordinator_title text;

comment on column public.event_settings.hack_ends_at is
  'The instant hacking stops. Set once from now() + duration when the clock is '
  'started, and only ever moved by an explicit extend. Every device counts '
  'down to this, so it is the single source of truth for "how long is left".';

comment on column public.event_settings.hack_duration_seconds is
  'Length the next start will run for. 129600 = 36 hours. Changing this does '
  'NOT move an already-running clock — use the extend action for that.';

-- 36 hours unless someone says otherwise, and the coordinator named on the
-- screen. Seeded with coalesce so re-running never overwrites a live edit.
update public.event_settings set
  hack_duration_seconds  = coalesce(nullif(hack_duration_seconds, 0), 129600),
  hack_coordinator_name  = coalesce(hack_coordinator_name, 'Aashutosh Devkota'),
  hack_coordinator_title = coalesce(hack_coordinator_title, 'Program Coordinator')
where id;

-- ---------------------------------------------------------------------------
-- hackathon_state — what every device reads
-- ---------------------------------------------------------------------------
-- Readable by any signed-in member: participants are the whole audience for
-- this clock. It returns server_now for the same reason pitch_state() does —
-- a phone with a wrong clock must still show the right number, so the client
-- measures its own skew against this rather than trusting the handset.

create or replace function public.hackathon_state()
returns table (
  status text,
  started_at timestamptz,
  ends_at timestamptz,
  duration_seconds integer,
  remaining_seconds integer,
  elapsed_seconds integer,
  coordinator_name text,
  coordinator_title text,
  started_by_name text,
  updated_at timestamptz,
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
    s.hack_started_at,
    s.hack_ends_at,
    s.hack_duration_seconds,
    case
      when s.hack_ends_at is null then null
      else floor(extract(epoch from s.hack_ends_at - now()))::integer
    end,
    case
      when s.hack_started_at is null then null
      else floor(extract(epoch from now() - s.hack_started_at))::integer
    end,
    s.hack_coordinator_name,
    s.hack_coordinator_title,
    p.full_name,
    s.updated_at,
    now()
  from public.event_settings s
  left join public.profiles p on p.id = s.hack_started_by
  where s.id and auth.uid() is not null;
$$;

-- ---------------------------------------------------------------------------
-- set_hackathon — the button, and the levers behind it
-- ---------------------------------------------------------------------------

create or replace function public.set_hackathon(
  action text,
  seconds integer default null,
  coordinator_name text default null,
  coordinator_title text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  run_seconds integer;
begin
  if not public.is_executive() then
    raise exception 'only executives can run the hackathon clock';
  end if;

  if action = 'start' then
    -- Idempotent, like cutting the ribbon. The coordinator is on a stage in
    -- front of the whole hall; a second press because the first "didn't look
    -- like it worked" must not restart a 36-hour countdown that is already
    -- running and already on 150 screens.
    select coalesce(nullif(seconds, 0), hack_duration_seconds, 129600)
      into run_seconds
      from public.event_settings where id;

    update public.event_settings set
      hack_started_at = now(),
      hack_ends_at    = now() + make_interval(secs => run_seconds),
      hack_started_by = auth.uid(),
      hack_duration_seconds = run_seconds,
      updated_by = auth.uid(),
      updated_at = now()
    where id and hack_started_at is null;

  elsif action = 'extend' then
    -- Signed: a negative value pulls the deadline in. Refuses to act on a
    -- clock that was never started, so a stray tap cannot invent an end time.
    if seconds is null or seconds = 0 then
      raise exception 'extend needs a non-zero number of seconds';
    end if;

    update public.event_settings set
      hack_ends_at = hack_ends_at + make_interval(secs => seconds),
      updated_by = auth.uid(),
      updated_at = now()
    where id and hack_started_at is not null and hack_ends_at is not null;

  elsif action = 'reset' then
    update public.event_settings set
      hack_started_at = null,
      hack_ends_at    = null,
      hack_started_by = null,
      updated_by = auth.uid(),
      updated_at = now()
    where id;

  elsif action = 'details' then
    -- Duration set here only takes effect at the next start, by design: see
    -- the header note about not moving a deadline teams are pacing against.
    update public.event_settings set
      hack_duration_seconds  = coalesce(nullif(seconds, 0), hack_duration_seconds),
      hack_coordinator_name  = coalesce(nullif(btrim(coordinator_name), ''), hack_coordinator_name),
      hack_coordinator_title = coalesce(nullif(btrim(coordinator_title), ''), hack_coordinator_title),
      updated_by = auth.uid(),
      updated_at = now()
    where id;

  else
    raise exception 'unknown hackathon action';
  end if;
end;
$$;

revoke all on function public.hackathon_state() from public, anon;
revoke all on function public.set_hackathon(text, integer, text, text) from public, anon;
grant execute on function public.hackathon_state() to authenticated;
grant execute on function public.set_hackathon(text, integer, text, text) to authenticated;
