-- ---------------------------------------------------------------------------
-- Attendance dashboard — aggregate in Postgres, not in Node.
-- ---------------------------------------------------------------------------
--
-- /admin/attendance used to pull up to 2000 check_in rows on every page load,
-- collect the profile ids out of them, issue a second query for those
-- profiles, count everything in JavaScript, and then throw away all but the 50
-- rows it actually displayed. On a 1 GB VPS with the desk, the canteen and two
-- supervisors all refreshing during a rush, that is the most expensive page in
-- the app by a wide margin — and it gets slower with every scan of the day.
--
-- These three functions each answer one question in one round trip, with the
-- filtering, joining, counting and paging done where the data already is.
--
-- Day bounds arrive as timestamptz from kathmanduDayRange() rather than being
-- recomputed here: Nepal's UTC+05:45 offset is already written down in one
-- place in the TypeScript, and two implementations of "when does Friday end"
-- is exactly the sort of thing that disagrees at 18:15Z.
-- ---------------------------------------------------------------------------

-- Shared with the app's stationKey(). Kept as SQL so the three functions below
-- and the TypeScript agree about what 'registration-desk' means.
create or replace function public.station_key(raw text)
returns text
language sql
immutable
as $$
  select case
    when raw in ('registration', 'registration-desk') then 'registration'
    when raw in ('exit', 'canteen') then raw
    else 'other'
  end;
$$;

-- ---------------------------------------------------------------------------
-- attendance_summary — the number tiles
-- ---------------------------------------------------------------------------

create or replace function public.attendance_summary(
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_station text default null,
  p_direction text default null,
  p_meal text default null,
  p_query text default null
)
returns table (
  scans integer,
  people integer,
  arrivals integer,
  departures integer,
  inside_now integer,
  by_station jsonb,
  by_meal jsonb,
  by_role jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_executive() then
    raise exception 'only executives can read the attendance log';
  end if;

  return query
  with filtered as (
    select c.id, c.profile_id, c.created_at, c.station, c.direction, c.meal,
           p.role::text as role
    from public.check_ins c
    join public.profiles p on p.id = c.profile_id
    where (p_from is null or c.created_at >= p_from)
      and (p_to   is null or c.created_at <  p_to)
      and (p_station is null or p_station = '' or public.station_key(c.station) = p_station)
      and (p_direction is null or p_direction = '' or c.direction = p_direction)
      and (p_meal is null or p_meal = '' or c.meal = p_meal)
      and (
        p_query is null or p_query = ''
        or p.full_name ilike '%' || p_query || '%'
        or p.email     ilike '%' || p_query || '%'
      )
  ),
  -- Presence is decided at the gates only. A canteen scan means someone ate,
  -- not that they came back in, so counting it would keep marking people
  -- present after they had gone home.
  gates as (
    select distinct on (f.profile_id) f.profile_id, f.direction
    from filtered f
    where public.station_key(f.station) in ('registration', 'exit')
    order by f.profile_id, f.created_at desc
  )
  select
    (select count(*) from filtered)::integer,
    (select count(distinct f.profile_id) from filtered f)::integer,
    (select count(*) from filtered f where f.direction <> 'out')::integer,
    (select count(*) from filtered f where f.direction =  'out')::integer,
    (select count(*) from gates g where g.direction <> 'out')::integer,
    coalesce((
      select jsonb_object_agg(k, n) from (
        select public.station_key(f.station) as k, count(*) as n
        from filtered f group by 1
      ) s
    ), '{}'::jsonb),
    coalesce((
      select jsonb_object_agg(m, info) from (
        select f.meal as m,
               jsonb_build_object(
                 'servings', count(*),
                 'people', count(distinct f.profile_id)
               ) as info
        from filtered f where f.meal is not null group by 1
      ) s
    ), '{}'::jsonb),
    coalesce((
      select jsonb_object_agg(r, n) from (
        select f.role as r, count(distinct f.profile_id) as n
        from filtered f group by 1
      ) s
    ), '{}'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- attendance_feed — the scan log, one page at a time, names already joined
-- ---------------------------------------------------------------------------

create or replace function public.attendance_feed(
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_station text default null,
  p_direction text default null,
  p_meal text default null,
  p_query text default null,
  p_role text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  created_at timestamptz,
  station text,
  direction text,
  meal text,
  profile_id uuid,
  full_name text,
  role text,
  team_name text,
  scanned_by_name text,
  total_count integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_executive() then
    raise exception 'only executives can read the attendance log';
  end if;

  return query
  with filtered as (
    select c.id, c.created_at, c.station, c.direction, c.meal, c.profile_id,
           p.full_name, p.role::text as role, p.team_name, c.scanned_by
    from public.check_ins c
    join public.profiles p on p.id = c.profile_id
    where (p_from is null or c.created_at >= p_from)
      and (p_to   is null or c.created_at <  p_to)
      and (p_station is null or p_station = '' or public.station_key(c.station) = p_station)
      and (p_direction is null or p_direction = '' or c.direction = p_direction)
      and (p_meal is null or p_meal = '' or c.meal = p_meal)
      and (p_role is null or p_role = '' or p.role::text = p_role)
      and (
        p_query is null or p_query = ''
        or p.full_name ilike '%' || p_query || '%'
        or p.email     ilike '%' || p_query || '%'
      )
  )
  select f.id, f.created_at, f.station, f.direction, f.meal, f.profile_id,
         f.full_name, f.role, f.team_name,
         scanner.full_name,
         count(*) over ()::integer
  from filtered f
  left join public.profiles scanner on scanner.id = f.scanned_by
  order by f.created_at desc
  limit greatest(least(coalesce(p_limit, 50), 200), 1)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- attendance_roll — "who is in the building right now?"
-- ---------------------------------------------------------------------------
-- The question the scan log could never answer without a human reading it
-- backwards. One row per person, newest gate scan decides in or out.

create or replace function public.attendance_roll(
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_role text default null,
  p_query text default null,
  p_presence text default null,   -- 'inside' | 'outside' | 'never' | null
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  profile_id uuid,
  full_name text,
  role text,
  team_name text,
  inside boolean,
  last_station text,
  last_direction text,
  last_seen timestamptz,
  scans integer,
  meals integer,
  first_in timestamptz,
  last_out timestamptz,
  total_count integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_executive() then
    raise exception 'only executives can read the attendance log';
  end if;

  return query
  with people as (
    select p.id, p.full_name, p.role::text as role, p.team_name
    from public.profiles p
    where p.is_active
      and (p_role is null or p_role = '' or p.role::text = p_role)
      and (
        p_query is null or p_query = ''
        or p.full_name ilike '%' || p_query || '%'
        or p.email     ilike '%' || p_query || '%'
      )
  ),
  scans_win as (
    select c.* from public.check_ins c
    where (p_from is null or c.created_at >= p_from)
      and (p_to   is null or c.created_at <  p_to)
  ),
  agg as (
    select s.profile_id,
           count(*)::integer as scans,
           count(*) filter (where s.meal is not null)::integer as meals,
           min(s.created_at) filter (where s.direction <> 'out') as first_in,
           max(s.created_at) filter (where s.direction =  'out') as last_out,
           max(s.created_at) as last_seen
    from scans_win s
    group by s.profile_id
  ),
  gate as (
    select distinct on (s.profile_id)
           s.profile_id, s.station, s.direction
    from scans_win s
    where public.station_key(s.station) in ('registration', 'exit')
    order by s.profile_id, s.created_at desc
  ),
  joined as (
    select pe.id, pe.full_name, pe.role, pe.team_name,
           coalesce(g.direction <> 'out', false) as inside,
           g.station as last_station,
           g.direction as last_direction,
           a.last_seen,
           coalesce(a.scans, 0) as scans,
           coalesce(a.meals, 0) as meals,
           a.first_in, a.last_out
    from people pe
    left join agg  a on a.profile_id = pe.id
    left join gate g on g.profile_id = pe.id
  ),
  final as (
    select * from joined j
    where p_presence is null or p_presence = ''
       or (p_presence = 'inside'  and j.inside)
       or (p_presence = 'outside' and not j.inside and j.last_seen is not null)
       or (p_presence = 'never'   and j.last_seen is null)
  )
  select f.id, f.full_name, f.role, f.team_name, f.inside,
         f.last_station, f.last_direction, f.last_seen,
         f.scans, f.meals, f.first_in, f.last_out,
         count(*) over ()::integer
  from final f
  order by f.inside desc, f.last_seen desc nulls last, f.full_name
  limit greatest(least(coalesce(p_limit, 50), 200), 1)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- Supports the day-window scans above; check_ins_profile_idx already covers
-- the per-person lookups.
create index if not exists check_ins_created_at_idx
  on public.check_ins (created_at desc);

create index if not exists check_ins_station_created_idx
  on public.check_ins (station, created_at desc);

revoke all on function public.attendance_summary(timestamptz, timestamptz, text, text, text, text) from public, anon;
revoke all on function public.attendance_feed(timestamptz, timestamptz, text, text, text, text, text, integer, integer) from public, anon;
revoke all on function public.attendance_roll(timestamptz, timestamptz, text, text, text, integer, integer) from public, anon;
grant execute on function public.attendance_summary(timestamptz, timestamptz, text, text, text, text) to authenticated;
grant execute on function public.attendance_feed(timestamptz, timestamptz, text, text, text, text, text, integer, integer) to authenticated;
grant execute on function public.attendance_roll(timestamptz, timestamptz, text, text, text, integer, integer) to authenticated;
