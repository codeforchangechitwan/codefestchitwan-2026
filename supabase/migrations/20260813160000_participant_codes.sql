-- Participant codes -------------------------------------------------------
--
-- Until now a person had no short human-readable identifier. Teams had one
-- (teams.code, "CFC-07"), but an individual could only be named by their full
-- name, their email, or the first eight hex characters of their QR token —
-- which is what /id-card calls the "Card ID". None of those work when a
-- volunteer is calling names off a printed sheet: names collide and repeat
-- across teams, and a hex fragment cannot be read aloud or written on a form.
--
-- So: profiles.participant_code, of the form "CFC-07-3" — the team's code plus
-- the member's seat within it, seat 1 always being the team leader. It is
-- derived from the registration spreadsheet rather than generated here, by
-- scripts/assign-participant-codes.mjs, for the same reason team codes are:
-- the spreadsheet is the thing the organisers can point at and check.
--
-- Staff (executives, volunteers, judges, mentors) belong to no team and keep a
-- null code. The column is therefore nullable, and the unique index is partial.

alter table public.profiles
  add column if not exists participant_code text;

comment on column public.profiles.participant_code is
  'Human-readable per-person ID, "CFC-07-3" = team CFC-07, seat 3. Seat 1 is '
  'the team leader. Null for staff, who belong to no team. Assigned by '
  'scripts/assign-participant-codes.mjs from the registration spreadsheet.';

-- Uppercased and trimmed on the way in, so a code typed by hand in the admin
-- UI cannot sit next to a generated one as a near-duplicate. This mirrors what
-- 20260811153221 does for teams.code, and for the same reason: the unique
-- index below is a plain one, not an expression, so normalisation has to
-- happen before it is consulted.
create or replace function public.normalise_participant_code()
returns trigger
language plpgsql
as $$
begin
  new.participant_code := nullif(upper(btrim(new.participant_code)), '');
  return new;
end;
$$;

drop trigger if exists profiles_normalise_participant_code on public.profiles;
create trigger profiles_normalise_participant_code
  before insert or update of participant_code on public.profiles
  for each row execute function public.normalise_participant_code();

create unique index if not exists profiles_participant_code_key
  on public.profiles (participant_code)
  where participant_code is not null;

-- A participant must not be able to renumber themselves. profiles is
-- self-updatable by design (avatar, food preference, medical note), and this
-- column joins the list of fields that only an executive may change.
create or replace function public.guard_profile_self_update()
returns trigger
language plpgsql
security definer
set search_path to 'public'
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
     or new.team_name is distinct from old.team_name
     or new.participant_code is distinct from old.participant_code then
    raise exception 'you cannot change protected profile fields';
  end if;

  return new;
end;
$$;

-- Both read projections gain the column. The return type changes, so these
-- have to be dropped and recreated rather than replaced.

drop function if exists public.team_roster(uuid);
create function public.team_roster(target_team uuid default null)
returns table (
  profile_id uuid,
  full_name text,
  participant_code text,
  role member_role,
  institution text,
  room text,
  checked_in_at timestamptz,
  is_self boolean
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.id, p.full_name, p.participant_code, p.role, p.institution, p.room,
         p.checked_in_at, p.id = auth.uid()
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

-- The desk searches by code as well as name, email and team: the code is the
-- one key a participant can read off their own slip without spelling anything.
drop function if exists public.participant_directory(text);
create function public.participant_directory(search text default null)
returns table (
  profile_id uuid,
  full_name text,
  participant_code text,
  email text,
  role member_role,
  title text,
  team_name text,
  institution text,
  room text,
  phone text,
  food_preference text,
  checked_in_at timestamptz,
  is_active boolean
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.id, p.full_name, p.participant_code, p.email, p.role, p.title,
         p.team_name, p.institution, p.room, p.phone, p.food_preference,
         p.checked_in_at, p.is_active
  from public.profiles p
  where public.is_desk_staff()
    and (
      search is null
      or btrim(search) = ''
      or p.full_name        ilike '%' || btrim(search) || '%'
      or p.email            ilike '%' || btrim(search) || '%'
      or p.team_name        ilike '%' || btrim(search) || '%'
      or p.participant_code ilike '%' || btrim(search) || '%'
    )
  order by p.full_name
  limit 200;
$$;

revoke all on function public.participant_directory(text) from public, anon;
grant execute on function public.participant_directory(text) to authenticated;
