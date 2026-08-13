-- GitHub profiles ---------------------------------------------------------
--
-- Participants post their own GitHub username from /profile, and the organising
-- team reads them back grouped by team at /admin/github.
--
-- Unlike participant_code, this column is deliberately NOT in the protected set
-- that guard_profile_self_update() rejects: it is the participant's to set and
-- to change, and it is the only field on the site they own outright. Nobody
-- else's records are reachable — row-level security already limits a
-- participant's UPDATE to their own row.
--
-- Stored as the username alone rather than a URL. Participants paste whatever
-- was in the address bar; src/lib/github.ts reduces that to the handle, and the
-- URL is rebuilt for display. Storing the URL instead would mean every read has
-- to cope with the half-dozen shapes a pasted profile link comes in.

alter table public.profiles
  add column if not exists github_username text;

comment on column public.profiles.github_username is
  'GitHub handle only, no URL — see src/lib/github.ts. Set by the participant '
  'themselves from /profile; not a protected field.';

-- GitHub's own rule, and the same expression src/lib/github.ts enforces:
-- alphanumerics and single hyphens, never at either end, 39 characters at most.
-- Written without lookahead so it is expressible here as well as in JavaScript.
alter table public.profiles
  drop constraint if exists profiles_github_username_check;

alter table public.profiles
  add constraint profiles_github_username_check check (
    github_username is null
    or (
      length(github_username) <= 39
      and github_username ~ '^[A-Za-z0-9](-?[A-Za-z0-9])*$'
    )
  );

-- Trimmed, and blank collapses to null so that clearing the field in the form
-- removes the value instead of storing an empty string that reads as "set".
create or replace function public.normalise_github_username()
returns trigger
language plpgsql
as $$
begin
  new.github_username := nullif(btrim(new.github_username), '');
  return new;
end;
$$;

drop trigger if exists profiles_normalise_github_username on public.profiles;
create trigger profiles_normalise_github_username
  before insert or update of github_username on public.profiles
  for each row execute function public.normalise_github_username();

-- Case-insensitive, because github.com/Octocat and github.com/octocat are one
-- account. Two people claiming one handle is a copy-paste of a teammate's link
-- far more often than it is anything legitimate, so it is worth a clear error
-- at the point of entry.
create unique index if not exists profiles_github_username_key
  on public.profiles (lower(github_username))
  where github_username is not null;
