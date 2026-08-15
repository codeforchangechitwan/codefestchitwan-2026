-- ---------------------------------------------------------------------------
-- The external form button — 16 August 2026
-- ---------------------------------------------------------------------------
--
-- The organisers run their intake on Google Forms and always will: the form
-- changes shape between rounds, the responses land in a Sheet the team already
-- shares, and nobody wants a schema migration to add a question. So this app
-- owns the BUTTON, not the form — one link, one label, one on/off switch, all
-- editable from /admin/form-link without a deploy.
--
-- It lives on the singleton event_settings row for the same reasons the pitch
-- timer and the hackathon clock do: existing RLS (members read, executives
-- write), and the existing pulse trigger, so flipping the switch reaches open
-- tabs rather than waiting for a refresh.
--
-- The label is stored, not hardcoded, because the same button is "Register on
-- the Google Form" in July and "Fill the feedback form" on the Sunday
-- afternoon. Retyping a URL in a deploy at 4pm on event day is exactly the
-- kind of change this table exists to avoid.
-- ---------------------------------------------------------------------------

alter table public.event_settings
  add column if not exists form_url text,
  add column if not exists form_label text not null
    default 'Register on the Google Form',
  add column if not exists form_note text,
  add column if not exists form_enabled boolean not null default false;

comment on column public.event_settings.form_url is
  'Destination of the public form button — a Google Forms link (forms.gle or '
  'docs.google.com), or any other http(s) form. Null means nothing to link to.';

comment on column public.event_settings.form_enabled is
  'Whether the button is drawn at all. Off by default: a half-configured link '
  'must not appear on the public homepage on its way to being finished.';

-- Shape by regex, length by length(): Postgres caps regex repetition counts at
-- 255, so an inline {4,500} raises instead of matching. Same reasoning, and
-- the same 500-character ceiling, as the submission link checks.
alter table public.event_settings
  drop constraint if exists event_settings_form_url_shape;
alter table public.event_settings
  add constraint event_settings_form_url_shape check (
    form_url is null
    or (form_url ~* '^https?://[^[:space:]]+$' and length(form_url) <= 500)
  );

alter table public.event_settings
  drop constraint if exists event_settings_form_label_length;
alter table public.event_settings
  add constraint event_settings_form_label_length check (
    btrim(form_label) <> '' and length(form_label) <= 60
  );

alter table public.event_settings
  drop constraint if exists event_settings_form_note_length;
alter table public.event_settings
  add constraint event_settings_form_note_length check (
    form_note is null or length(form_note) <= 200
  );

-- A button that is on must have somewhere to go. Enforced here rather than in
-- the form, so "switch it on" and "clear the URL" cannot race into a live
-- link to nowhere.
alter table public.event_settings
  drop constraint if exists event_settings_form_enabled_needs_url;
alter table public.event_settings
  add constraint event_settings_form_enabled_needs_url check (
    not form_enabled or form_url is not null
  );

-- ---------------------------------------------------------------------------
-- public_form_link — what an anonymous visitor is allowed to read
-- ---------------------------------------------------------------------------
-- A separate, narrow function rather than opening event_settings to `anon`:
-- that row also holds the submission deadline, the judging switch and the
-- clock's internals, none of which belong on a page the whole internet loads.
--
-- Returns ZERO ROWS when the button is off. The callers render nothing at all
-- in that case, so "off" is indistinguishable from "never configured" — there
-- is no disabled button advertising a link that is not ready.
create or replace function public.public_form_link()
returns table (label text, url text, note text)
language sql
stable
security definer
set search_path = public
as $$
  select s.form_label, s.form_url, s.form_note
  from public.event_settings s
  where s.id
    and s.form_enabled
    and s.form_url is not null;
$$;

revoke all on function public.public_form_link() from public;
grant execute on function public.public_form_link() to anon, authenticated;
