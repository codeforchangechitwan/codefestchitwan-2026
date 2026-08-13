-- ---------------------------------------------------------------------------
-- Meal tracking — 13 August 2026
--
-- The canteen serves eight sittings across the three days (Day 1 lunch and
-- dinner; Day 2 breakfast, lunch, snacks, dinner; Day 3 lunch) to a hundred
-- people. Scans recorded station = 'canteen' and nothing else, so the desk
-- could not answer the only question it is ever asked — "has this person
-- already taken lunch?" — and catering had no per-sitting count.
--
-- Adds `meal` to check_ins, threads it through record_scan, and reports how
-- many times this person has already presented for THIS meal TODAY.
--
-- Nothing is refused. Same rule as the rest of the desk: a second helping is
-- logged and flagged in red, not blocked. A volunteer facing a queue must
-- never have to argue with the software.
--
-- record_scan is dropped and recreated rather than overloaded. Adding a
-- defaulted parameter would leave the three-argument version resolvable, so
-- an un-migrated caller would keep silently writing meal-less rows. Safe to do
-- now: check_ins is empty and the doors open tomorrow.
-- ---------------------------------------------------------------------------

alter table public.check_ins
  add column if not exists meal text;

comment on column public.check_ins.meal is
  'breakfast | lunch | snacks | dinner. Null for every non-canteen scan. '
  'Normalised by record_scan(), not by a CHECK constraint — the same reasoning '
  'as station: a constraint violation surfaces as a raw Postgres error in a '
  'volunteer''s face mid-queue, and this column is written on that hot path.';

-- Swag is a distribution point, not a sitting, so it is a station rather than
-- a meal. Same "has this person already collected it" question, different desk.
comment on column public.check_ins.station is
  'registration | exit | canteen | swag | other. Legacy rows say '
  'registration-desk. Normalised by record_scan(), not by a constraint.';

create index if not exists check_ins_meal_idx
  on public.check_ins (meal, created_at desc)
  where meal is not null;

-- ---------------------------------------------------------------------------
-- record_scan — now meal-aware
-- ---------------------------------------------------------------------------

drop function if exists public.record_scan(uuid, text, text);

create or replace function public.record_scan(
  token uuid,
  station text default 'registration',
  direction text default 'in',
  meal text default null
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
  meal_recorded text,
  scanned_at timestamptz,
  scan_count integer,
  previous_direction text,
  -- How many times this card has already been presented for this meal today,
  -- BEFORE this scan. 0 is the normal case; anything higher is a second
  -- helping and the UI says so.
  meal_repeat integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.profiles;
  was_first boolean;
  stamped_at timestamptz := now();
  v_station text;
  v_direction text;
  v_meal text;
  v_prior_count integer;
  v_prior_direction text;
  v_meal_repeat integer := 0;
  v_day_start timestamptz;
begin
  if not public.is_desk_staff() then
    raise exception 'not authorised to record scans';
  end if;

  v_station := lower(btrim(coalesce(station, '')));
  if v_station = 'registration-desk' then
    v_station := 'registration';
  end if;
  if v_station not in ('registration', 'exit', 'canteen', 'swag') then
    v_station := 'other';
  end if;

  v_direction := lower(btrim(coalesce(direction, '')));
  if v_direction not in ('in', 'out') then
    v_direction := 'in';
  end if;

  -- A meal only means something at the canteen. Anywhere else it is discarded
  -- rather than stored, so "lunch at the exit gate" cannot enter the data.
  v_meal := lower(btrim(coalesce(meal, '')));
  if v_station <> 'canteen' or v_meal not in ('breakfast', 'lunch', 'snacks', 'dinner') then
    v_meal := null;
  end if;

  select * into target from public.profiles p where p.qr_token = record_scan.token;
  if not found then
    raise exception 'unknown card';
  end if;

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

  -- Repeats are counted per meal per Kathmandu day, so yesterday's lunch does
  -- not flag today's.
  if v_meal is not null then
    select count(*) into v_meal_repeat
    from public.check_ins c
    where c.profile_id = target.id
      and c.meal = v_meal
      and c.created_at >= v_day_start;
  end if;

  was_first := target.checked_in_at is null and v_direction = 'in';
  if was_first then
    update public.profiles p set checked_in_at = stamped_at where p.id = target.id;
  end if;

  insert into public.check_ins (profile_id, scanned_by, station, direction, meal, created_at)
  values (target.id, auth.uid(), v_station, v_direction, v_meal, stamped_at);

  return query
    select target.id, target.full_name, target.role, target.team_name, target.room,
           target.is_active, was_first, v_station, v_direction, v_meal, stamped_at,
           (v_prior_count + 1)::integer, v_prior_direction, v_meal_repeat;
end;
$$;

revoke all on function public.record_scan(uuid, text, text, text) from public, anon;
grant execute on function public.record_scan(uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Catering counts
-- ---------------------------------------------------------------------------
-- One row per meal per day with headcount and repeat count, so the kitchen can
-- be told "ninety-one had lunch" without anybody exporting a spreadsheet.

create or replace function public.meal_totals()
returns table (
  day date,
  meal text,
  people integer,
  servings integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (c.created_at at time zone 'Asia/Kathmandu')::date as day,
    c.meal,
    count(distinct c.profile_id)::integer as people,
    count(*)::integer as servings
  from public.check_ins c
  where c.meal is not null
    and public.is_desk_staff()
  group by 1, 2
  order by 1, 2;
$$;

revoke all on function public.meal_totals() from public, anon;
grant execute on function public.meal_totals() to authenticated;
