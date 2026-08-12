-- ---------------------------------------------------------------------------
-- Pitch deck and documentation links — 12 August 2026
--
-- Links, not uploads, for the same reason as the screenshots array: a Storage
-- bucket is a second RLS dialect plus upload code plus size limits, and forty
-- teams pushing files through saturated venue wifi in the last ten minutes
-- before the deadline is exactly the failure that queues at the desk.
--
-- Deliberately NOT added to submissions_final_is_complete: altering that CHECK
-- is a drop + add + full validate hours before the deadline, and a team that
-- could not build a deck must still be able to submit. Encouraged in the form
-- copy, not enforced by the database.
-- ---------------------------------------------------------------------------

alter table public.submissions
  add column if not exists deck_url text,
  add column if not exists docs_url text;

-- Recreated with two more URL blocks. Five near-identical blocks rather than a
-- loop, on purpose: each raises a field-specific message, and this function
-- runs on the submission critical path where readability beats DRY.
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
  if new.deck_url is not null
     and (new.deck_url !~* '^https?://[^[:space:]]+$' or length(new.deck_url) > 500) then
    raise exception 'pitch deck link must be a full http(s) URL under 500 characters';
  end if;
  if new.docs_url is not null
     and (new.docs_url !~* '^https?://[^[:space:]]+$' or length(new.docs_url) > 500) then
    raise exception 'documentation link must be a full http(s) URL under 500 characters';
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

-- create or replace resets grants; re-apply per 20260811154126.
revoke all on function public.stamp_submission() from public, anon, authenticated;
