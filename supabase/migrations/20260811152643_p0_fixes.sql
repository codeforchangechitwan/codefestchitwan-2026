-- ---------------------------------------------------------------------------
-- P0 fixes, 11 August 2026 — three days before doors open.
--
-- 1. Volunteers could not check anyone in. The profile guard trigger fired
--    inside check_in_by_token and raised on the first-ever scan of every card.
-- 2. A participant could POST a finished, top-scoring quiz attempt.
-- 3. room and must_change_password were self-writable.
--
-- DEPLOY ORDER MATTERS. The app change that clears must_change_password with
-- the service role (src/app/(member)/profile/password/actions.ts) must be live
-- BEFORE this migration runs, or every participant is trapped on
-- /profile/password. See the plan, §2.2.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1 + 3 — profiles guard
-- ---------------------------------------------------------------------------
-- The intent is unchanged: a member must never promote themselves, forge a
-- check-in, mint a new QR token, or move themselves to another room.
--
-- Three things change.
--
--   a. auth.uid() IS NULL now passes. SECURITY DEFINER swaps current_user but
--      NOT the request.jwt.claims GUC that auth.uid() reads, so this branch is
--      reachable only by the service role, migrations, and the SQL editor. An
--      `authenticated` session with no sub claim matches zero rows under
--      profiles_update_self (id = null yields NULL) and is_executive() is
--      false for it; `anon` has no policy on profiles at all. A null uid here
--      is therefore provably a caller that already bypasses RLS.
--      This is what unbreaks setMemberActive / rotateQrToken / setMemberRole.
--
--   b. Desk staff may stamp a FIRST check-in and nothing else — a one-way
--      null -> timestamp transition. This is what unbreaks check_in_by_token,
--      which runs SECURITY DEFINER but keeps the volunteer's auth.uid().
--      Blast radius: a volunteer could mark their own row checked in, since
--      profiles_update_self still pins them to id = auth.uid(). They still
--      cannot clear a check-in, change a role, or rotate a token.
--
--   c. room and must_change_password join the protected set.
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
  -- Service role, migrations, SQL editor.
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
     or new.must_change_password is distinct from old.must_change_password then
    raise exception 'you cannot change protected profile fields';
  end if;

  return new;
end;
$$;

-- Unchanged, recreated so a replay on a fresh project is idempotent.
-- BEFORE-row triggers fire in name order, so this still runs ahead of
-- profiles_touch_updated_at, and updated_at is not in the protected set.
drop trigger if exists profiles_guard_self_update on public.profiles;
create trigger profiles_guard_self_update
  before update on public.profiles
  for each row execute function public.guard_profile_self_update();

-- ---------------------------------------------------------------------------
-- 2 — forgeable quiz attempts
-- ---------------------------------------------------------------------------
-- The old policy checked only user_id = auth.uid(), so a participant holding
-- the anon key could insert a finished attempt with score 9999 and top the
-- leaderboard. Server-side grading could not correct it either: submitAttempt
-- bails on an attempt that already has submitted_at set.
--
-- An attempt may now only ever be created blank. Grading happens server-side
-- with the service role, and there is no UPDATE or DELETE policy on this
-- table, so a rejected insert cannot be repaired afterwards.
--
-- started_at is bounded for the same reason: it is the leaderboard tie-break
-- input, and a future value yields a NEGATIVE duration_ms which both passes
-- the time-limit check in submitAttempt and sorts first under
-- quiz_leaderboard's `duration_ms asc nulls last`.
--
-- startAttempt inserts only { quiz_id, user_id }, so every other column falls
-- to its default and satisfies this check. No application change is needed.
drop policy if exists quiz_attempts_insert_own on public.quiz_attempts;
create policy quiz_attempts_insert_own on public.quiz_attempts
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and score = 0
    and total_points = 0
    and duration_ms is null
    and submitted_at is null
    and started_at between now() - interval '1 minute'
                       and now() + interval '1 minute'
    and exists (
      select 1
      from public.quizzes q
      where q.id = quiz_attempts.quiz_id
        and q.is_published
    )
  );
