-- Row Level Security.
--
-- Default posture: deny. Members see themselves and public event data;
-- executives administer; the answer key is unreachable from any client.

alter table public.registrations      enable row level security;
alter table public.profiles           enable row level security;
alter table public.schedule_events    enable row level security;
alter table public.announcements      enable row level security;
alter table public.quizzes            enable row level security;
alter table public.quiz_questions     enable row level security;
alter table public.quiz_answer_keys   enable row level security;
alter table public.quiz_attempts      enable row level security;
alter table public.quiz_answers       enable row level security;
alter table public.check_ins          enable row level security;

-- ---------------------------------------------------------------------------
-- registrations — executives only
-- ---------------------------------------------------------------------------

drop policy if exists registrations_executive_all on public.registrations;
create policy registrations_executive_all on public.registrations
  for all to authenticated
  using (public.is_executive())
  with check (public.is_executive());

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_executive());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_executive())
  with check (id = auth.uid() or public.is_executive());

drop policy if exists profiles_insert_executive on public.profiles;
create policy profiles_insert_executive on public.profiles
  for insert to authenticated
  with check (public.is_executive());

drop policy if exists profiles_delete_executive on public.profiles;
create policy profiles_delete_executive on public.profiles
  for delete to authenticated
  using (public.is_executive());

-- A member must not be able to promote themselves. Executives change roles
-- through the admin panel, which uses the service role.
create or replace function public.guard_profile_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_executive() then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.is_active is distinct from old.is_active
     or new.qr_token is distinct from old.qr_token
     or new.checked_in_at is distinct from old.checked_in_at
     or new.email is distinct from old.email then
    raise exception 'you cannot change protected profile fields';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_self_update on public.profiles;
create trigger profiles_guard_self_update
  before update on public.profiles
  for each row execute function public.guard_profile_self_update();

-- ---------------------------------------------------------------------------
-- schedule_events — the timeline is public information
-- ---------------------------------------------------------------------------

drop policy if exists schedule_public_read on public.schedule_events;
create policy schedule_public_read on public.schedule_events
  for select to anon, authenticated
  using (
    visible_to is null
    or auth.uid() is null and visible_to is null
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = any (visible_to)
    )
  );

drop policy if exists schedule_executive_write on public.schedule_events;
create policy schedule_executive_write on public.schedule_events
  for all to authenticated
  using (public.is_executive())
  with check (public.is_executive());

-- ---------------------------------------------------------------------------
-- announcements — members only, filtered by audience
-- ---------------------------------------------------------------------------

drop policy if exists announcements_member_read on public.announcements;
create policy announcements_member_read on public.announcements
  for select to authenticated
  using (
    audience is null
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = any (audience)
    )
  );

drop policy if exists announcements_executive_write on public.announcements;
create policy announcements_executive_write on public.announcements
  for all to authenticated
  using (public.is_executive())
  with check (public.is_executive());

-- ---------------------------------------------------------------------------
-- quizzes & questions — published only; answer key stays server-side
-- ---------------------------------------------------------------------------

drop policy if exists quizzes_member_read on public.quizzes;
create policy quizzes_member_read on public.quizzes
  for select to authenticated
  using (is_published or public.is_executive());

drop policy if exists quizzes_executive_write on public.quizzes;
create policy quizzes_executive_write on public.quizzes
  for all to authenticated
  using (public.is_executive())
  with check (public.is_executive());

drop policy if exists quiz_questions_member_read on public.quiz_questions;
create policy quiz_questions_member_read on public.quiz_questions
  for select to authenticated
  using (
    public.is_executive()
    or exists (
      select 1 from public.quizzes q
      where q.id = quiz_id and q.is_published
    )
  );

drop policy if exists quiz_questions_executive_write on public.quiz_questions;
create policy quiz_questions_executive_write on public.quiz_questions
  for all to authenticated
  using (public.is_executive())
  with check (public.is_executive());

-- quiz_answer_keys deliberately has RLS enabled and NO policies:
-- unreachable via anon/authenticated, readable only by the service role.

-- ---------------------------------------------------------------------------
-- attempts & answers — own only
-- ---------------------------------------------------------------------------

drop policy if exists quiz_attempts_own on public.quiz_attempts;
create policy quiz_attempts_own on public.quiz_attempts
  for select to authenticated
  using (user_id = auth.uid() or public.is_executive());

drop policy if exists quiz_attempts_insert_own on public.quiz_attempts;
create policy quiz_attempts_insert_own on public.quiz_attempts
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists quiz_answers_own on public.quiz_answers;
create policy quiz_answers_own on public.quiz_answers
  for select to authenticated
  using (
    exists (
      select 1 from public.quiz_attempts a
      where a.id = attempt_id
        and (a.user_id = auth.uid() or public.is_executive())
    )
  );

-- ---------------------------------------------------------------------------
-- check_ins — desk staff
-- ---------------------------------------------------------------------------

drop policy if exists check_ins_desk_read on public.check_ins;
create policy check_ins_desk_read on public.check_ins
  for select to authenticated
  using (public.is_desk_staff() or profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Function grants
-- ---------------------------------------------------------------------------

revoke all on function public.verify_qr_token(uuid) from public, anon;
grant execute on function public.verify_qr_token(uuid) to authenticated;

revoke all on function public.check_in_by_token(uuid, text) from public, anon;
grant execute on function public.check_in_by_token(uuid, text) to authenticated;

revoke all on function public.quiz_leaderboard(uuid, integer) from public, anon;
grant execute on function public.quiz_leaderboard(uuid, integer) to authenticated;
