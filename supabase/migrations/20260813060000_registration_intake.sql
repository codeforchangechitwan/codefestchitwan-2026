-- ---------------------------------------------------------------------------
-- Registration intake — 13 August 2026
--
-- Everything the four registration spreadsheets need that the schema did not
-- already carry, plus the two access boundaries that were missing:
--
--   * judges could not read a single submission. The submissions read policy
--     was `is_executive() or team_id = my_team_id()`, so the panel that does
--     the judging had no way to see what it was judging.
--   * volunteers could not look a participant up. Reading `profiles` is gated
--     on is_executive(), so a volunteer at the desk saw scan results and
--     nothing else.
--
-- Both are opened here deliberately narrowly: judging behind a lever an
-- executive flips, and the volunteer view as a projection that cannot return
-- a card token or a medical note.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Profile columns the registration form collects
-- ---------------------------------------------------------------------------

alter table public.profiles
  -- Executive portfolio ("Project Lead", "Tech Lead"), or a judge's
  -- affiliation. Free text: the organisers invent these every year.
  add column if not exists title text,
  add column if not exists food_preference text,
  add column if not exists allergy text,
  add column if not exists medical_note text,
  -- Organiser scratch note. Written by normalise-identities.mjs to record a
  -- previous login address, so somebody locked out on Friday morning can be
  -- traced back to the row they came in on.
  add column if not exists notes text;

comment on column public.profiles.medical_note is
  'Health information from the registration form. Readable only by the member '
  'themselves and by executives — profiles is gated on is_executive(), and the '
  'desk-staff projection participant_directory() deliberately omits it.';

comment on column public.profiles.title is
  'Executive portfolio or judge affiliation. Display only; role drives access.';

-- Deliberately NOT added to guard_profile_self_update's protected set. A
-- member correcting their own allergy the night before is exactly the update
-- that should not need an executive.

-- ---------------------------------------------------------------------------
-- 2. Judging lever
-- ---------------------------------------------------------------------------
-- Separate from submissions_open. Submissions close at the deadline; judging
-- opens when the panel is actually seated, which on Sunday is a different
-- moment and sometimes a much later one.

alter table public.event_settings
  add column if not exists judging_open boolean not null default false;

comment on column public.event_settings.judging_open is
  'Executive-controlled. While false, judges see no submissions at all.';

create or replace function public.judging_is_open()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select s.judging_open from public.event_settings s where s.id), false);
$$;

create or replace function public.is_judge()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'judge' and is_active
  );
$$;

-- Mentors are intentionally not given submission access. They coach during the
-- build; handing them the finished entries adds nothing and widens the set of
-- people who can read unpublished work.

-- ---------------------------------------------------------------------------
-- 3. Judges read submissions, but only once judging is open
-- ---------------------------------------------------------------------------

drop policy if exists submissions_read on public.submissions;
create policy submissions_read on public.submissions
  for select to authenticated
  using (
    public.is_executive()
    or team_id = public.my_team_id()
    or (public.is_judge() and public.judging_is_open())
  );

-- A submission without its team is a row of URLs, so judges need the team row
-- too. Same gate, same reasoning.
drop policy if exists teams_read_own on public.teams;
create policy teams_read_own on public.teams
  for select to authenticated
  using (
    public.is_executive()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.team_id = teams.id
    )
    or (public.is_judge() and public.judging_is_open())
  );

-- ---------------------------------------------------------------------------
-- 4. Desk-staff participant lookup
-- ---------------------------------------------------------------------------
-- A projection rather than a widened policy on profiles, for the same reason
-- team_roster() is one: that table holds qr_token, and handing a volunteer a
-- token hands them a working identity card. medical_note and allergy are left
-- out too — the desk does not need them to check somebody in, and health data
-- should not spread across sixteen more accounts by default.

create or replace function public.participant_directory(search text default null)
returns table (
  profile_id uuid,
  full_name text,
  email text,
  role public.member_role,
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
set search_path = public
as $$
  select p.id, p.full_name, p.email, p.role, p.title, p.team_name,
         p.institution, p.room, p.phone, p.food_preference,
         p.checked_in_at, p.is_active
  from public.profiles p
  where public.is_desk_staff()
    and (
      search is null
      or btrim(search) = ''
      or p.full_name ilike '%' || btrim(search) || '%'
      or p.email      ilike '%' || btrim(search) || '%'
      or p.team_name  ilike '%' || btrim(search) || '%'
    )
  order by p.full_name
  limit 200;
$$;

revoke all on function public.participant_directory(text) from public, anon;
grant execute on function public.participant_directory(text) to authenticated;

revoke all on function public.judging_is_open() from public, anon;
grant execute on function public.judging_is_open() to authenticated;

revoke all on function public.is_judge() from public, anon;
grant execute on function public.is_judge() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Team codes
-- ---------------------------------------------------------------------------
-- The registration form never asked for one, so the import generates
-- CFC-01..CFC-18 in submission order. Recorded here so the numbering is not a
-- mystery when somebody reads the teams table in a year's time.
