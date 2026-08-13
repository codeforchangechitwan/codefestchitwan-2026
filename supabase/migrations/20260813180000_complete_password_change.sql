-- Let a member finish their own forced password change ---------------------
--
-- The forced-password-change flow was doing this with the service role, for a
-- good reason: must_change_password is a protected column, and
-- guard_profile_self_update() refuses self-writes to it so that a member cannot
-- skip the prompt by PATCHing the flag straight at PostgREST.
--
-- The cost of that was a hard dependency on SUPABASE_SERVICE_ROLE_KEY in a path
-- every single participant walks on their first login. Where that variable is
-- not set, requireServiceRoleKey() throws and the request 500s — *after*
-- auth.updateUser() has already changed the password. The member is then in the
-- worst possible state: the password on their printed slip no longer works, the
-- flag is still set, and every retry lands them back on the same page. Zero of
-- 77 participants had ever completed this flow.
--
-- So the write moves here, into a function the member's own session may call.
-- The flag stays protected against a direct PATCH; it can only be cleared
-- through this function, and only when the credential really did just change.

create or replace function public.complete_password_change()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  changed_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  select u.updated_at into changed_at from auth.users u where u.id = auth.uid();

  -- Ties clearing the prompt to an actual credential change, so calling this
  -- instead of setting a password does not skip the step. Deliberately lenient:
  -- a null updated_at is allowed through rather than locking somebody out of
  -- their own account on event morning over a timestamp we do not control.
  if changed_at is not null and changed_at < now() - interval '10 minutes' then
    raise exception 'change your password before clearing the prompt';
  end if;

  -- Transaction-local, and read by guard_profile_self_update() below. PostgREST
  -- gives clients no way to set this themselves; only this function does.
  perform set_config('app.clearing_password_prompt', 'on', true);

  update public.profiles
     set must_change_password = false
   where id = auth.uid();
end;
$$;

revoke all on function public.complete_password_change() from public, anon;
grant execute on function public.complete_password_change() to authenticated;

-- must_change_password moves out of the blanket protected-field check and into
-- its own, so it can recognise the function above. Everything else is unchanged.
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
     or new.team_id is distinct from old.team_id
     or new.team_name is distinct from old.team_name
     or new.participant_code is distinct from old.participant_code then
    raise exception 'you cannot change protected profile fields';
  end if;

  if new.must_change_password is distinct from old.must_change_password
     and coalesce(
           current_setting('app.clearing_password_prompt', true), 'off'
         ) <> 'on' then
    raise exception 'you cannot change protected profile fields';
  end if;

  return new;
end;
$$;
