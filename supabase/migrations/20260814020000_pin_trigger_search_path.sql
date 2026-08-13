-- Pin the search_path on the two normalisation triggers -------------------
--
-- normalise_participant_code() and normalise_github_username() were added
-- without `set search_path`, which every other function here sets. Supabase's
-- database linter flags them as function_search_path_mutable.
--
-- Neither is SECURITY DEFINER, so the exposure is small — they run as the
-- calling role. But a function whose search_path is resolved from the session
-- can be pointed at a different schema's operators by whoever controls that
-- setting, and there is no reason for these two to be the exceptions.

create or replace function public.normalise_participant_code()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  new.participant_code := nullif(upper(btrim(new.participant_code)), '');
  return new;
end;
$$;

create or replace function public.normalise_github_username()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  new.github_username := nullif(btrim(new.github_username), '');
  return new;
end;
$$;
