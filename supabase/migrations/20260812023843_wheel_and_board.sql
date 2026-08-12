-- ---------------------------------------------------------------------------
-- The draw — table assignment (Friday) and pitch order (Sunday)
-- ---------------------------------------------------------------------------

alter table public.teams
  add column if not exists pitch_order integer;

-- Partial unique: nothing writes this column today, so the index cannot fail
-- on apply. Deliberately NO unique index on table_number — the imported roster
-- may already contain duplicates, and a migration that fails at 03:00 is worse
-- than a duplicate table tent. draw_next() assigns uniquely by construction.
create unique index if not exists teams_pitch_order_key
  on public.teams (pitch_order) where pitch_order is not null;

-- ---------------------------------------------------------------------------
-- draw_next — the actual draw. The spin on screen is decoration.
-- ---------------------------------------------------------------------------
-- The winner is chosen by the server's PRNG, committed, and only then returned
-- to the browser. No client input reaches the outcome and the result survives a
-- mid-spin refresh, which is what makes the draw defensible for a prize event.
--
-- It is also the only design that survives the global reduced-motion rule in
-- globals.css:131-143, which forces animation-duration to 0.01ms and would
-- make any animation-timed draw resolve instantly.
create or replace function public.draw_next(mode text)
returns table (
  team_id uuid,
  team_code text,
  team_name text,
  slot integer,
  left_to_draw integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  picked public.teams;
  next_slot integer;
  remaining_count integer;
begin
  if not public.is_executive() then
    raise exception 'only executives can run the draw';
  end if;
  if mode not in ('tables', 'pitch') then
    raise exception 'unknown draw mode';
  end if;

  -- Two projectors, one draw.
  perform pg_advisory_xact_lock(hashtext('codefest-draw-' || mode));

  if mode = 'pitch' then
    select * into picked from public.teams t
      where t.pitch_order is null order by random() limit 1;
  else
    select * into picked from public.teams t
      where t.table_number is null order by random() limit 1;
  end if;

  if not found then
    raise exception 'every team already has a slot';
  end if;

  if mode = 'pitch' then
    select coalesce(max(t.pitch_order), 0) + 1 into next_slot from public.teams t;
    update public.teams t set pitch_order = next_slot where t.id = picked.id;
    select count(*) into remaining_count from public.teams t where t.pitch_order is null;
  else
    -- Continue past whatever the roster CSV already contains, reading only the
    -- digits so a value like 'C-201' still yields a usable high-water mark.
    select coalesce(
             max(nullif(regexp_replace(t.table_number, '\D', '', 'g'), '')::integer), 0
           ) + 1
      into next_slot from public.teams t;
    update public.teams t set table_number = next_slot::text where t.id = picked.id;
    select count(*) into remaining_count from public.teams t where t.table_number is null;
  end if;

  return query select picked.id, picked.code, picked.name, next_slot, remaining_count::integer;
end;
$$;

-- You will rehearse the ceremony the night before. Make that safe.
create or replace function public.reset_draw(mode text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  touched integer;
begin
  if not public.is_executive() then
    raise exception 'only executives can reset the draw';
  end if;
  if mode = 'pitch' then
    update public.teams set pitch_order = null where pitch_order is not null;
  elsif mode = 'tables' then
    update public.teams set table_number = null where table_number is not null;
  else
    raise exception 'unknown draw mode';
  end if;
  get diagnostics touched = row_count;
  return touched;
end;
$$;

-- ---------------------------------------------------------------------------
-- pitch_board — participants see the whole order, not just their own row
-- ---------------------------------------------------------------------------
-- teams_read_own restricts a participant to their own team. Same reasoning as
-- team_roster() in 20260811152936_teams.sql: a projection rather than a wider
-- policy, so teams.notes stays organiser-only.
create or replace function public.pitch_board()
returns table (
  team_id uuid,
  team_code text,
  team_name text,
  institution text,
  room text,
  table_number text,
  pitch_order integer,
  is_mine boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.code, t.name, t.institution, t.room, t.table_number, t.pitch_order,
         t.id = public.my_team_id()
  from public.teams t
  where auth.uid() is not null
  order by t.pitch_order nulls last, t.code;
$$;

revoke all on function public.draw_next(text)   from public, anon;
revoke all on function public.reset_draw(text)  from public, anon;
revoke all on function public.pitch_board()     from public, anon;
grant execute on function public.draw_next(text)  to authenticated;
grant execute on function public.reset_draw(text) to authenticated;
grant execute on function public.pitch_board()    to authenticated;
