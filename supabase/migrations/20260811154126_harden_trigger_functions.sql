-- ---------------------------------------------------------------------------
-- Hardening pass over the functions added today, prompted by the Supabase
-- security advisors.
-- ---------------------------------------------------------------------------

-- normalise_team_keys was the one new function without a pinned search_path.
create or replace function public.normalise_team_keys()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.code := upper(btrim(new.code));
  new.name := btrim(new.name);
  return new;
end;
$$;

-- PostgREST exposes every function in the public schema at
-- /rest/v1/rpc/<name>, trigger functions included. Calling one directly errors
-- ("can only be called as a trigger"), but there is no reason to offer them.
--
-- Revoking EXECUTE does NOT stop the triggers firing: Postgres checks EXECUTE
-- when the trigger is created, not on each invocation. Verified against the
-- live project — check-in, the team-name cache, the profile guard and the
-- submission stamp all still fire, and a direct RPC call is refused.
revoke all on function public.guard_profile_self_update() from public, anon, authenticated;
revoke all on function public.sync_profile_team_name()   from public, anon, authenticated;
revoke all on function public.refresh_team_name_cache()  from public, anon, authenticated;
revoke all on function public.normalise_team_keys()      from public, anon, authenticated;
revoke all on function public.stamp_submission()         from public, anon, authenticated;
revoke all on function public.handle_new_user()          from public, anon, authenticated;
revoke all on function public.touch_updated_at()         from public, anon, authenticated;
