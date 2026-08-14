-- ---------------------------------------------------------------------------
-- Live updates + the ribbon ceremony — 13 August 2026, the night before.
-- ---------------------------------------------------------------------------
--
-- WHY A SIGNAL TABLE AND NOT postgres_changes ON THE REAL TABLES
--
-- Supabase applies RLS to realtime. teams_read_own limits a participant to
-- their own team row and quiz_attempts_own to their own attempts, so a
-- subscription on those tables would deliver a participant exactly one row —
-- their own — and never tell them that ANOTHER team was just drawn. The draw
-- board and the leaderboard are precisely the screens where you need to hear
-- about other people.
--
-- So the tables emit a contentless pulse instead: "something in topic X
-- changed". Every authenticated user may read pulses, because a pulse carries
-- no data to leak. The client then re-reads through the function it is already
-- allowed to call (pitch_board, quiz_leaderboard, ...), and RLS does its
-- normal job on that read.
--
-- The second reason is load. Those re-reads go from the BROWSER to Supabase,
-- not through the Next.js server on the 1 GB VPS. Before this, 100 phones in a
-- hall polled /api/pitch every 2s — about 50 req/s of pure timer traffic
-- through nginx and Node. After it, the steady state is one websocket per
-- phone to Supabase and nothing at all to the VPS.
-- ---------------------------------------------------------------------------

create table if not exists public.live_pulse (
  id bigint generated always as identity primary key,
  topic text not null,
  at timestamptz not null default now()
);

create index if not exists live_pulse_at_idx on public.live_pulse (at desc);

alter table public.live_pulse enable row level security;

-- Readable by every signed-in member; a row is a topic name and a timestamp.
drop policy if exists live_pulse_member_read on public.live_pulse;
create policy live_pulse_member_read on public.live_pulse
  for select to authenticated using (true);

-- Deliberately NO insert/update/delete policy. Rows arrive only through the
-- security-definer trigger below, so a client cannot forge a pulse and make
-- every phone in the hall re-read at once.

-- ---------------------------------------------------------------------------
-- The emitter
-- ---------------------------------------------------------------------------

create or replace function public.emit_pulse()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.live_pulse (topic) values (tg_argv[0]);

  -- Opportunistic pruning. An event weekend produces a few thousand rows at
  -- most, but the table should not outlive the weekend either. Doing this on
  -- ~2% of writes keeps it off the hot path of a draw.
  if random() < 0.02 then
    delete from public.live_pulse where at < now() - interval '30 minutes';
  end if;

  return null;
end;
$$;

-- Statement-level, not row-level: a draw that updates one row and a bulk
-- reset that updates sixty both mean the same thing to a listening phone —
-- "re-read the board" — and should cost one pulse, not sixty.

drop trigger if exists announcements_pulse on public.announcements;
create trigger announcements_pulse
  after insert or update or delete on public.announcements
  for each statement execute function public.emit_pulse('announcements');

drop trigger if exists teams_pulse on public.teams;
create trigger teams_pulse
  after insert or update or delete on public.teams
  for each statement execute function public.emit_pulse('draw');

drop trigger if exists event_settings_pulse on public.event_settings;
create trigger event_settings_pulse
  after update on public.event_settings
  for each statement execute function public.emit_pulse('event');

drop trigger if exists quiz_attempts_pulse on public.quiz_attempts;
create trigger quiz_attempts_pulse
  after insert or update on public.quiz_attempts
  for each statement execute function public.emit_pulse('leaderboard');

-- ---------------------------------------------------------------------------
-- Publish it to Realtime
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'live_pulse'
     )
  then
    alter publication supabase_realtime add table public.live_pulse;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- The ribbon
-- ---------------------------------------------------------------------------
-- One more set of columns on the same singleton row every other lever already
-- lives on, so the ceremony inherits event_settings' RLS and its pulse trigger
-- for free: cutting the ribbon emits 'event', which every phone is already
-- listening to for the pitch timer.

alter table public.event_settings
  add column if not exists ceremony_title text,
  add column if not exists chief_guest_name text,
  add column if not exists chief_guest_title text,
  add column if not exists ribbon_cut_at timestamptz,
  add column if not exists ribbon_cut_by uuid references auth.users (id) on delete set null;

comment on column public.event_settings.ribbon_cut_at is
  'When the chief guest cut the ribbon. Null until they do. This is the '
  'moment the programme officially began, and every device reads it.';

create or replace function public.ceremony_state()
returns table (
  ceremony_title text,
  chief_guest_name text,
  chief_guest_title text,
  ribbon_cut_at timestamptz,
  cut_by_name text,
  seconds_since_cut integer,
  server_now timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.ceremony_title,
    s.chief_guest_name,
    s.chief_guest_title,
    s.ribbon_cut_at,
    p.full_name,
    case
      when s.ribbon_cut_at is null then null
      else floor(extract(epoch from now() - s.ribbon_cut_at))::integer
    end,
    now()
  from public.event_settings s
  left join public.profiles p on p.id = s.ribbon_cut_by
  where s.id and auth.uid() is not null;
$$;

-- seconds_since_cut is what lets a phone that loads AFTER the cut decide
-- between "celebrate now" and "the programme is under way" — the same reason
-- pitch_state() returns server_now rather than trusting the handset clock.

create or replace function public.set_ceremony(
  action text,
  guest_name text default null,
  guest_title text default null,
  title text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_executive() then
    raise exception 'only executives can run the ceremony';
  end if;

  if action = 'cut' then
    -- Idempotent on purpose. Two executives both tapping the button at the
    -- moment the scissors close must not move the timestamp and re-fire the
    -- celebration on every phone that already played it.
    update public.event_settings set
      ribbon_cut_at = now(),
      ribbon_cut_by = auth.uid(),
      updated_by = auth.uid(),
      updated_at = now()
    where id and ribbon_cut_at is null;

  elsif action = 'reset' then
    update public.event_settings set
      ribbon_cut_at = null,
      ribbon_cut_by = null,
      updated_by = auth.uid(),
      updated_at = now()
    where id;

  elsif action = 'details' then
    update public.event_settings set
      ceremony_title    = coalesce(nullif(btrim(title), ''), ceremony_title),
      chief_guest_name  = coalesce(nullif(btrim(guest_name), ''), chief_guest_name),
      chief_guest_title = coalesce(nullif(btrim(guest_title), ''), chief_guest_title),
      updated_by = auth.uid(),
      updated_at = now()
    where id;

  else
    raise exception 'unknown ceremony action';
  end if;
end;
$$;

revoke all on function public.ceremony_state() from public, anon;
revoke all on function public.set_ceremony(text, text, text, text) from public, anon;
grant execute on function public.ceremony_state() to authenticated;
grant execute on function public.set_ceremony(text, text, text, text) to authenticated;
