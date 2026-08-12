-- ---------------------------------------------------------------------------
-- Project submissions — 11 August 2026
--
-- One submission per team, locked at a deadline that lives in the database
-- rather than in the UI. Judging is on paper this year, so this is an intake
-- and archival record, not a scoring system.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- event_settings — a single row of event-day levers
-- ---------------------------------------------------------------------------
-- Deliberately NOT stored in schedule_events: that table is display-oriented
-- (free-text time_label, nullable starts_at), publicly readable, and its seed
-- migration opens with a `delete ... where day in (...)` that would silently
-- drop a deadline on a re-seed.
create table if not exists public.event_settings (
  id boolean primary key default true check (id),
  -- 15 minutes before Presentations at 09:00 on 16 Aug.
  submission_deadline timestamptz not null
    default timestamptz '2026-08-16 08:45+05:45',
  -- Manual lever for "the wifi died, give them ten more minutes".
  submissions_open boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

insert into public.event_settings (id) values (true) on conflict (id) do nothing;

alter table public.event_settings enable row level security;

drop policy if exists event_settings_member_read on public.event_settings;
create policy event_settings_member_read on public.event_settings
  for select to authenticated using (true);

drop policy if exists event_settings_executive_write on public.event_settings;
create policy event_settings_executive_write on public.event_settings
  for all to authenticated
  using (public.is_executive()) with check (public.is_executive());

create or replace function public.submissions_are_open()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select s.submissions_open and now() <= s.submission_deadline
     from public.event_settings s where s.id),
    false);
$$;

-- ---------------------------------------------------------------------------
-- submissions
-- ---------------------------------------------------------------------------
-- Screenshots are URLs, not uploads. A Storage bucket would mean a second RLS
-- dialect, upload code, MIME/size validation and signed-URL rendering — and,
-- decisively, forty teams pushing phone screenshots through saturated venue
-- wifi in the last ten minutes before the deadline. A pasted link is 200 bytes
-- and survives 2G.
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null unique references public.teams (id) on delete cascade,
  title text not null default '',
  description text not null default '',
  repo_url text,
  demo_url text,
  video_url text,
  screenshots text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'submitted')),
  submitted_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint submissions_screenshot_count
    check (coalesce(array_length(screenshots, 1), 0) <= 4),

  -- A final submission must actually contain something.
  constraint submissions_final_is_complete
    check (
      status = 'draft'
      or (btrim(title) <> '' and repo_url is not null and submitted_at is not null)
    )
);

create index if not exists submissions_status_idx on public.submissions (status);

-- Owns every server-side column. Note the URL checks live here rather than in
-- CHECK constraints: a CHECK cannot contain a subquery, so per-element
-- validation of the screenshots array has nowhere else to go.
create or replace function public.stamp_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  shot text;
begin
  new.updated_at := now();
  if auth.uid() is not null then
    new.updated_by := auth.uid();
    if tg_op = 'INSERT' then new.created_by := auth.uid(); end if;
  end if;

  if tg_op = 'UPDATE' and new.team_id is distinct from old.team_id then
    raise exception 'a submission cannot be moved to another team';
  end if;

  -- Shape by regex, length by length(): Postgres caps regex repetition counts
  -- at 255, so an inline {4,500} raises instead of matching.
  if new.repo_url is not null
     and (new.repo_url !~* '^https?://[^[:space:]]+$' or length(new.repo_url) > 500) then
    raise exception 'repo link must be a full http(s) URL under 500 characters';
  end if;
  if new.demo_url is not null
     and (new.demo_url !~* '^https?://[^[:space:]]+$' or length(new.demo_url) > 500) then
    raise exception 'demo link must be a full http(s) URL under 500 characters';
  end if;
  if new.video_url is not null
     and (new.video_url !~* '^https?://[^[:space:]]+$' or length(new.video_url) > 500) then
    raise exception 'video link must be a full http(s) URL under 500 characters';
  end if;
  foreach shot in array new.screenshots loop
    if shot !~* '^https?://[^[:space:]]+$' or length(shot) > 500 then
      raise exception 'every screenshot must be a full http(s) URL under 500 characters';
    end if;
  end loop;

  -- Never trust a client-supplied timestamp.
  if new.status = 'submitted'
     and (tg_op = 'INSERT' or old.status is distinct from 'submitted') then
    new.submitted_at := now();
  elsif new.status = 'draft' then
    new.submitted_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists submissions_stamp on public.submissions;
create trigger submissions_stamp
  before insert or update on public.submissions
  for each row execute function public.stamp_submission();

-- ---------------------------------------------------------------------------
-- RLS — the deadline is enforced here, not in the UI
-- ---------------------------------------------------------------------------

alter table public.submissions enable row level security;

drop policy if exists submissions_read on public.submissions;
create policy submissions_read on public.submissions
  for select to authenticated
  using (public.is_executive() or team_id = public.my_team_id());

drop policy if exists submissions_insert_own_team on public.submissions;
create policy submissions_insert_own_team on public.submissions
  for insert to authenticated
  with check (
    team_id = public.my_team_id()
    and public.submissions_are_open()
  );

drop policy if exists submissions_update_own_team on public.submissions;
create policy submissions_update_own_team on public.submissions
  for update to authenticated
  using  (team_id = public.my_team_id() and public.submissions_are_open())
  with check (team_id = public.my_team_id() and public.submissions_are_open());

-- No DELETE policy for participants: a team must not be able to delete and
-- re-create to reset submitted_at.
--
-- Executives keep write access after the deadline on purpose, so the desk can
-- fix a mangled link during presentations.
drop policy if exists submissions_executive_all on public.submissions;
create policy submissions_executive_all on public.submissions
  for all to authenticated
  using (public.is_executive()) with check (public.is_executive());
