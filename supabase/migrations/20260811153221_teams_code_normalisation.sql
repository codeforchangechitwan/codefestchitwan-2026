-- ---------------------------------------------------------------------------
-- teams.code — normalise in a trigger, index plainly
-- ---------------------------------------------------------------------------
-- The unique index created alongside the teams table was on
-- upper(btrim(code)) — an EXPRESSION index, which PostgREST cannot use as an
-- on_conflict target. scripts/import-teams.mjs upserts teams by code, so it
-- needs a plain unique index on the column.
--
-- Normalising in a trigger keeps the same guarantee (no two teams differing
-- only by case or padding) while leaving the column directly indexable.
-- teams.name keeps its case-insensitive expression index; nothing upserts on
-- name.
create or replace function public.normalise_team_keys()
returns trigger
language plpgsql
as $$
begin
  new.code := upper(btrim(new.code));
  new.name := btrim(new.name);
  return new;
end;
$$;

drop trigger if exists teams_normalise_keys on public.teams;
create trigger teams_normalise_keys
  before insert or update of code, name on public.teams
  for each row execute function public.normalise_team_keys();

-- Normalise anything already stored before the plain unique index goes on.
update public.teams set code = code;

drop index if exists public.teams_code_key;
create unique index if not exists teams_code_key on public.teams (code);
