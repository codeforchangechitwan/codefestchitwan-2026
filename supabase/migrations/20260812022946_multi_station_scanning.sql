-- ---------------------------------------------------------------------------
-- Multi-station scanning — 12 August 2026
--
-- Registration / Exit / Canteen, In / Out. Every scan is LOGGED and nothing is
-- ENFORCED: no duplicate blocking, no meal windows. A volunteer facing a queue
-- of two hundred people must never be shown a refusal they have to reason
-- about at 07:05.
--
-- Deliberately does NOT touch check_in_by_token or verify_qr_token. Those sit
-- on the registration desk's critical path, and the /verify/[token]
-- phone-camera flow keeps using check_in_by_token unchanged.
--
-- profiles.checked_in_at keeps meaning "first ever arrival" and nothing else.
-- guard_profile_self_update permits desk staff exactly one null -> timestamp
-- transition (see 20260811152643_p0_fixes.sql), so every other in/out/meal
-- event is a row in check_ins and never a write to profiles.
-- ---------------------------------------------------------------------------

alter table public.check_ins
  add column if not exists direction text not null default 'in';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'check_ins_direction_valid'
  ) then
    alter table public.check_ins
      add constraint check_ins_direction_valid check (direction in ('in', 'out'));
  end if;
end
$$;

-- station stays free text ON PURPOSE. A CHECK constraint would raise inside
-- check_in_by_token's insert (which names no station beyond its default) and
-- inside record_scan, surfacing a raw Postgres error at the desk. record_scan
-- normalises to a known set and falls back to 'other' instead — which is
-- fixable with a create-or-replace, with no lock on a hot table.
comment on column public.check_ins.station is
  'registration | exit | canteen | other. Legacy rows say registration-desk. Normalised by record_scan(), not by a constraint.';

comment on column public.check_ins.direction is
  'in | out. Defaulted so the untouched check_in_by_token insert stays legal.';

create index if not exists check_ins_station_idx
  on public.check_ins (station, created_at desc);

-- ---------------------------------------------------------------------------
-- record_scan — the one call the scanner makes per card
-- ---------------------------------------------------------------------------
-- Returns everything the result card renders, so a scan is ONE round trip
-- rather than lookupCard() + a tap + checkIn(). At 07:00 that roughly halves
-- the queue's per-person latency.
--
-- The only guard is "is the caller desk staff". A deactivated card is logged
-- AND flagged rather than refused, because the desk supervisor needs the
-- record that it was presented.
create or replace function public.record_scan(
  token uuid,
  station text default 'registration',
  direction text default 'in'
)
returns table (
  profile_id uuid,
  full_name text,
  role public.member_role,
  team_name text,
  room text,
  is_active boolean,
  first_time boolean,
  station_recorded text,
  direction_recorded text,
  scanned_at timestamptz,
  scan_count integer,
  previous_direction text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.profiles;
  was_first boolean;
  stamped_at timestamptz := now();
  -- IN parameters are copied into locals with distinct names: `station` and
  -- `direction` collide with columns of the same name on check_ins, and an
  -- unqualified reference inside a query over that table is ambiguous.
  v_station text;
  v_direction text;
  v_prior_count integer;
  v_prior_direction text;
  v_day_start timestamptz;
begin
  if not public.is_desk_staff() then
    raise exception 'not authorised to record scans';
  end if;

  v_station := lower(btrim(coalesce(station, '')));
  if v_station = 'registration-desk' then
    v_station := 'registration';
  end if;
  if v_station not in ('registration', 'exit', 'canteen') then
    v_station := 'other';
  end if;

  v_direction := lower(btrim(coalesce(direction, '')));
  if v_direction not in ('in', 'out') then
    v_direction := 'in';
  end if;

  select * into target from public.profiles p where p.qr_token = record_scan.token;
  if not found then
    raise exception 'unknown card';
  end if;

  -- Deliberately NOT refused when inactive: the supervisor needs the record
  -- that the card was presented. The UI flags it in red.

  v_day_start := date_trunc('day', stamped_at at time zone 'Asia/Kathmandu')
                 at time zone 'Asia/Kathmandu';

  select count(*) into v_prior_count
  from public.check_ins c
  where c.profile_id = target.id
    and c.station = v_station
    and c.created_at >= v_day_start;

  select c.direction into v_prior_direction
  from public.check_ins c
  where c.profile_id = target.id
    and c.station = v_station
  order by c.created_at desc
  limit 1;

  -- The single write to profiles the guard trigger permits for a volunteer:
  -- one-way null -> timestamp, and only on an arrival.
  was_first := target.checked_in_at is null and v_direction = 'in';
  if was_first then
    update public.profiles p set checked_in_at = stamped_at where p.id = target.id;
  end if;

  insert into public.check_ins (profile_id, scanned_by, station, direction, created_at)
  values (target.id, auth.uid(), v_station, v_direction, stamped_at);

  return query
    select target.id, target.full_name, target.role, target.team_name, target.room,
           target.is_active, was_first, v_station, v_direction, stamped_at,
           (v_prior_count + 1)::integer, v_prior_direction;
end;
$$;

revoke all on function public.record_scan(uuid, text, text) from public, anon;
grant execute on function public.record_scan(uuid, text, text) to authenticated;
