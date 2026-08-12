-- ---------------------------------------------------------------------------
-- Teams — 11 August 2026
--
-- Until now a "team" was just free text in profiles.team_name, so two people
-- typing the same string were not linked in any way. This adds a real team
-- entity, keyed off a short code that the desk can read off a table tent.
--
-- profiles.team_name is deliberately KEPT as a denormalised cache. Dropping it
-- would force simultaneous changes to quiz_leaderboard, verify_qr_token,
-- handle_new_user and createMember — and two of those sit on the check-in
-- critical path, where a `returns table` signature change means a
-- drop-and-recreate. Not three days before doors open. team_id is the source
-- of truth; triggers keep the cache honest.
-- ---------------------------------------------------------------------------

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  -- Short human code, printed on the table tent and said out loud at the desk.
  code text not null,
  name text not null,
  institution text,
  track text,
  room text,
  table_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Case/whitespace-insensitive uniqueness: rosters arrive from spreadsheets.
create unique index if not exists teams_code_key on public.teams (upper(btrim(code)));
create unique index if not exists teams_name_key on public.teams (lower(btrim(name)));

drop trigger if exists teams_touch_updated_at on public.teams;
create trigger teams_touch_updated_at
  before update on public.teams
  for each row execute function public.touch_updated_at();

alter table public.profiles
  add column if not exists team_id uuid references public.teams (id) on delete set null;

create index if not exists profiles_team_idx on public.profiles (team_id);

-- ---------------------------------------------------------------------------
-- team_name cache
-- ---------------------------------------------------------------------------
-- Fires only when team_id is actually named in the statement, so it never
-- lands on the check-in path (check_in_by_token sets checked_in_at alone).
-- On INSERT with no team_id it leaves whatever handle_new_user supplied from
-- the auth metadata, rather than nulling it.
create or replace function public.sync_profile_team_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.team_id is null then
    return new;
  end if;

  new.team_name := (select t.name from public.teams t where t.id = new.team_id);
  return new;
end;
$$;

-- zz_ prefix: BEFORE-row triggers fire in name order, so this runs after
-- profiles_guard_self_update has had its say about the change.
drop trigger if exists profiles_zz_sync_team_name on public.profiles;
create trigger profiles_zz_sync_team_name
  before insert or update of team_id on public.profiles
  for each row execute function public.sync_profile_team_name();

-- Renaming a team refreshes every member's cached copy.
create or replace function public.refresh_team_name_cache()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set team_name = new.name where team_id = new.id;
  return null;
end;
$$;

drop trigger if exists teams_refresh_name_cache on public.teams;
create trigger teams_refresh_name_cache
  after update of name on public.teams
  for each row
  when (new.name is distinct from old.name)
  execute function public.refresh_team_name_cache();

-- ---------------------------------------------------------------------------
-- Guard: team membership is set by the organisers, never self-assigned.
-- ---------------------------------------------------------------------------
-- Same function as the p0_fixes migration, with team_id and team_name added
-- to the protected set.
create or replace function public.guard_profile_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_check_in boolean;
  stamping_first_check_in boolean;
begin
  if auth.uid() is null then
    return new;
  end if;

  if public.is_executive() then
    return new;
  end if;

  changed_check_in := new.checked_in_at is distinct from old.checked_in_at;
  stamping_first_check_in :=
    old.checked_in_at is null and new.checked_in_at is not null;

  if changed_check_in
     and not (stamping_first_check_in and public.is_desk_staff()) then
    raise exception 'you cannot change your check-in status';
  end if;

  if new.role is distinct from old.role
     or new.is_active is distinct from old.is_active
     or new.qr_token is distinct from old.qr_token
     or new.email is distinct from old.email
     or new.room is distinct from old.room
     or new.must_change_password is distinct from old.must_change_password
     or new.team_id is distinct from old.team_id
     or new.team_name is distinct from old.team_name then
    raise exception 'you cannot change protected profile fields';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.teams enable row level security;

drop policy if exists teams_read_own on public.teams;
create policy teams_read_own on public.teams
  for select to authenticated
  using (
    public.is_executive()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.team_id = teams.id
    )
  );

drop policy if exists teams_executive_write on public.teams;
create policy teams_executive_write on public.teams
  for all to authenticated
  using (public.is_executive())
  with check (public.is_executive());

-- ---------------------------------------------------------------------------
-- Teammate roster
-- ---------------------------------------------------------------------------
-- Deliberately a projection rather than a wider policy on profiles: that table
-- holds qr_token, and handing a teammate your token hands them a working
-- identity card. Same shape as verify_qr_token and quiz_leaderboard.
create or replace function public.team_roster(target_team uuid default null)
returns table (
  profile_id uuid,
  full_name text,
  role public.member_role,
  institution text,
  room text,
  checked_in_at timestamptz,
  is_self boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.role, p.institution, p.room, p.checked_in_at,
         p.id = auth.uid()
  from public.profiles p
  where auth.uid() is not null
    and p.team_id is not null
    and p.team_id = coalesce(
          case when public.is_executive() then target_team end,
          (select me.team_id from public.profiles me where me.id = auth.uid())
        )
  order by (p.id = auth.uid()) desc, p.full_name;
$$;

revoke all on function public.team_roster(uuid) from public, anon;
grant execute on function public.team_roster(uuid) to authenticated;

-- Used by the submissions policies.
create or replace function public.my_team_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select team_id from public.profiles where id = auth.uid() and is_active;
$$;

revoke all on function public.my_team_id() from public, anon;
grant execute on function public.my_team_id() to authenticated;

-- ---------------------------------------------------------------------------
-- Best-effort backfill for anyone who already typed a team name that matches
-- an imported team.
-- ---------------------------------------------------------------------------
update public.profiles p
set team_id = t.id
from public.teams t
where p.team_id is null
  and p.team_name is not null
  and lower(btrim(p.team_name)) = lower(btrim(t.name));
