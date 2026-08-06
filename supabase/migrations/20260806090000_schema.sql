-- Codefest Chitwan 2026 — core schema
-- Roles, member profiles, the 14–16 August schedule, announcements,
-- quizzes/games, and QR check-in.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'member_role') then
    create type public.member_role as enum (
      'executive',
      'volunteer',
      'mentor',
      'judge',
      'participant',
      'other'
    );
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Registrations: the pre-approved list. An account can only ever be created
-- for an email that appears here, which is what makes the system closed.
-- ---------------------------------------------------------------------------

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null,
  role public.member_role not null default 'participant',
  team_name text,
  institution text,
  phone text,
  notes text,
  -- Set once the auth user has been created and the password mailed out.
  provisioned_at timestamptz,
  provisioned_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists registrations_email_idx on public.registrations (lower(email));
create index if not exists registrations_role_idx on public.registrations (role);

-- ---------------------------------------------------------------------------
-- Profiles: one row per auth user, created by trigger below.
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role public.member_role not null default 'participant',
  team_name text,
  institution text,
  phone text,
  -- Room allocated at the registration desk (Building A).
  room text,
  avatar_url text,
  -- Opaque token encoded into the identity-card QR. Rotatable if a card leaks.
  qr_token uuid not null unique default gen_random_uuid(),
  must_change_password boolean not null default true,
  checked_in_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_qr_token_idx on public.profiles (qr_token);

-- ---------------------------------------------------------------------------
-- Schedule
-- ---------------------------------------------------------------------------

create table if not exists public.schedule_events (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  day_label text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  -- Kept as free text because the source timeline mixes formats
  -- ("Until 9:00 AM", "7:40 PM onwards").
  time_label text not null,
  title text not null,
  zone text,
  description text,
  sort_order integer not null default 0,
  -- null = everyone. Otherwise restrict to these roles.
  visible_to public.member_role[],
  created_at timestamptz not null default now()
);

create index if not exists schedule_events_day_idx on public.schedule_events (day, sort_order);

-- ---------------------------------------------------------------------------
-- Announcements
-- ---------------------------------------------------------------------------

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  urgent boolean not null default false,
  audience public.member_role[],
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists announcements_created_at_idx on public.announcements (created_at desc);

-- ---------------------------------------------------------------------------
-- Quizzes & games
-- ---------------------------------------------------------------------------

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  time_limit_seconds integer not null default 600,
  is_published boolean not null default false,
  opens_at timestamptz,
  closes_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  prompt text not null,
  options jsonb not null,
  points integer not null default 1,
  sort_order integer not null default 0,
  constraint quiz_questions_options_is_array check (jsonb_typeof(options) = 'array')
);

create index if not exists quiz_questions_quiz_idx on public.quiz_questions (quiz_id, sort_order);

-- The answer key lives in its own table with NO row-level policies, so it is
-- unreachable with the anon key no matter what a participant tries. Grading
-- happens server-side with the service role.
create table if not exists public.quiz_answer_keys (
  question_id uuid primary key references public.quiz_questions (id) on delete cascade,
  correct_index integer not null
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  score integer not null default 0,
  total_points integer not null default 0,
  -- Milliseconds spent, used to break leaderboard ties.
  duration_ms integer,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  unique (quiz_id, user_id)
);

create index if not exists quiz_attempts_leaderboard_idx
  on public.quiz_attempts (quiz_id, score desc, duration_ms asc);

create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts (id) on delete cascade,
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  selected_index integer,
  is_correct boolean,
  unique (attempt_id, question_id)
);

-- ---------------------------------------------------------------------------
-- Check-in log (QR scans at the registration desk)
-- ---------------------------------------------------------------------------

create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  scanned_by uuid references auth.users (id) on delete set null,
  -- e.g. 'registration-desk', 'main-hall', 'cafeteria'
  station text not null default 'registration-desk',
  created_at timestamptz not null default now()
);

create index if not exists check_ins_profile_idx on public.check_ins (profile_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Triggers & helper functions
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Creates the profile row whenever an auth user is created. Values come from
-- the metadata the admin passes to the Admin API.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  resolved_role public.member_role;
begin
  begin
    resolved_role := (meta ->> 'role')::public.member_role;
  exception when others then
    resolved_role := 'participant';
  end;

  insert into public.profiles (id, email, full_name, role, team_name, institution, phone)
  values (
    new.id,
    new.email,
    coalesce(nullif(meta ->> 'full_name', ''), split_part(new.email, '@', 1)),
    coalesce(resolved_role, 'participant'),
    nullif(meta ->> 'team_name', ''),
    nullif(meta ->> 'institution', ''),
    nullif(meta ->> 'phone', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Is the current user an executive? Used throughout the policies below.
-- SECURITY DEFINER so the policy on `profiles` does not recurse into itself.
create or replace function public.is_executive()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'executive' and is_active
  );
$$;

-- Can this user operate the QR scanner / see the desk views?
create or replace function public.is_desk_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('executive', 'volunteer')
      and is_active
  );
$$;

-- Look up a member from an identity-card QR token. SECURITY DEFINER so desk
-- staff can resolve a card without being able to read the whole profile table.
create or replace function public.verify_qr_token(token uuid)
returns table (
  profile_id uuid,
  full_name text,
  role public.member_role,
  team_name text,
  institution text,
  room text,
  is_active boolean,
  checked_in_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.role, p.team_name, p.institution,
         p.room, p.is_active, p.checked_in_at
  from public.profiles p
  where p.qr_token = token
    and public.is_desk_staff();
$$;

-- Record a scan and stamp first check-in.
create or replace function public.check_in_by_token(token uuid, station text default 'registration-desk')
returns table (profile_id uuid, full_name text, role public.member_role, first_time boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.profiles;
  was_first boolean;
begin
  if not public.is_desk_staff() then
    raise exception 'not authorised to check members in';
  end if;

  select * into target from public.profiles where qr_token = token;
  if not found then
    raise exception 'unknown card';
  end if;

  if not target.is_active then
    raise exception 'this card has been deactivated';
  end if;

  was_first := target.checked_in_at is null;

  if was_first then
    update public.profiles set checked_in_at = now() where id = target.id;
  end if;

  insert into public.check_ins (profile_id, scanned_by, station)
  values (target.id, auth.uid(), station);

  return query select target.id, target.full_name, target.role, was_first;
end;
$$;

-- Leaderboard without exposing the profiles table to every member.
create or replace function public.quiz_leaderboard(target_quiz uuid, max_rows integer default 50)
returns table (
  rank bigint,
  user_id uuid,
  full_name text,
  team_name text,
  score integer,
  total_points integer,
  duration_ms integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    row_number() over (order by a.score desc, a.duration_ms asc nulls last, a.submitted_at asc),
    a.user_id,
    p.full_name,
    p.team_name,
    a.score,
    a.total_points,
    a.duration_ms
  from public.quiz_attempts a
  join public.profiles p on p.id = a.user_id
  where a.quiz_id = target_quiz
    and a.submitted_at is not null
    and auth.uid() is not null
  order by a.score desc, a.duration_ms asc nulls last, a.submitted_at asc
  limit greatest(max_rows, 1);
$$;
