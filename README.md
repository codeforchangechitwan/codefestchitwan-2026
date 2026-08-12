# codefestchitwan-2026

Informative site and member app for the **Codefest 2026 Hackathon — Chitwan**, organised by Code for Change at Forbes College, Bharatpur-2, Kshetrapur, 14–16 August 2026.

Mobile-first, installable as a PWA, and closed by design: accounts exist only for people on the registration list.

## What's in it

**Public pages** — home with countdown and prize pool, about, the full three-day timeline, venue and building map, all 30 partners, contact.

**Member area** (sign-in required)

- Dashboard with the session happening now and what's next
- Digital identity card with a scannable QR, colour-coded per category
- Quizzes and games with a timer and a live leaderboard
- Announcements, targetable to specific categories
- Profile and password management

**Admin** (executive members)

- Create accounts and email one-time passwords
- Resend passwords, rotate a leaked QR, suspend or restore access
- Camera QR scanner for check-in at the registration desk
- Attendance log — every scan at every station, filterable by day, station and
  direction, with manual check-in for a lost card or a camera that won't focus
- Teams — codes, rooms, table numbers, and who is on which team
- Publish/hide quizzes, post announcements
- Exports: roster, attendance and submissions as CSV, and every identity-card
  QR as a zip for the badge print run

## Categories

`executive` · `volunteer` · `mentor` · `judge` · `participant` · `other`

Category drives navigation, page access, and the colour of the identity card. Executives reach the admin panel; executives and volunteers can operate the scanner.

## How authentication works

There is **no public sign-up anywhere in the app**.

1. An executive adds a member in `/admin/members` with their registered email.
2. The server creates the Supabase auth user with a random 14-character password and mails it over SMTP.
3. The member signs in and is forced to set their own password before reaching anything else.
4. Suspending a member blocks sign-in without deleting their data.

If SMTP isn't configured, the account is still created and the generated password is displayed once in the admin panel to send manually.

## Stack

- Next.js 16 (App Router, Turbopack) · React 19.2 · TypeScript
- Tailwind CSS v4, themed from the Chitwan poster (brown `#8b4513`, coral `#f2705b`, navy `#001b3a`), light and dark
- Supabase — Postgres, Auth, Row Level Security
- `qrcode` for card generation, `@zxing/browser` for scanning, `nodemailer` for credential mail, `jszip` for the badge print archive

Session refresh and route gating live in `src/proxy.ts` — Next.js 16 renamed Middleware to Proxy.

## Getting started

Node 22 or newer — `@supabase/supabase-js` needs native WebSocket, and on Node 20 the client throws at startup. There is an `.nvmrc`, so `nvm use` picks the right version.

```bash
nvm use
npm install
cp .env.example .env.local   # then fill in the Supabase keys
npm run dev
```

### Database

Apply the migrations in `supabase/migrations/` in filename order, either through the Supabase SQL editor or the CLI:

```bash
supabase db push
```

They create the schema, RLS policies, the seeded 14–16 August timeline, and a ten-question warm-up quiz.

**Create the first executive**, otherwise nobody can reach the admin panel. Create a user in the Supabase dashboard (Authentication → Users), then:

```sql
update public.profiles
set role = 'executive', must_change_password = false
where email = 'you@example.com';
```

### Security model

- RLS is on for every table; the default is deny.
- `quiz_answer_keys` has RLS enabled and **no policies at all** — unreachable with the anon key, readable only by the service role during grading.
- Members can't change their own `role`, `is_active`, `qr_token` or `email`; a trigger rejects it.
- Card lookup and check-in go through `SECURITY DEFINER` functions that verify the caller is desk staff, so volunteers can verify a card without being able to read the profiles table.
- The service-role client is marked `server-only`, so importing it into client code is a build error.

## Supabase MCP

`.mcp.json` configures the Supabase MCP server for this project. To authenticate, run this in a regular terminal (not an IDE extension):

```bash
claude /mcp
```

Select `supabase`, then Authenticate. Optionally add the Supabase agent skills:

```bash
npx skills add supabase/agent-skills
```

## Deploying

Set every variable from `.env.example` in the host's environment, with `NEXT_PUBLIC_SITE_URL` pointing at the public origin — identity-card QRs encode it, so getting it wrong makes cards resolve to the wrong host.

```bash
npm run build && npm start
```

## Notes for the organising team

- **Partner names**: `src/lib/partners.ts` carries two provenances. Entries marked
  `announced: true` come from the official partner announcement slides: the tier
  is quoted from the slide caption, while the trading name and address follow
  the partner's own logo, which wins wherever a slide disagreed with itself
  (caption "Chitwan Cake Shop" vs logo "Chitwan Cake House"). Entries still
  marked `verify: true` were read from small logos on the poster: please confirm
  the spelling and add website URLs. The announcements already corrected three
  earlier readings (`Kathmandu Cake Shop` → **Chitwan Cake House**, `PA Sports`
  → **DS Sports**, `Lords Hotels & Resorts` → **Lords CBC Plaza**), so treat the
  remaining unverified names with the same suspicion.
- **Partner logos**: the announcement slides carry each partner's logo, but no
  standalone logo files have been supplied, so the partners page is text-only.
  Drop the artwork into `public/brand/partners/` and add a `logo` field if you
  want them rendered.
- **Schedule**: the database is the source of truth. `src/lib/schedule-fallback.ts` holds the same timeline so the public page still renders if the database is unreachable on venue wifi — update both if the schedule changes, **and push the migration**. A migration that only exists in this repo changes nothing: the judges' revision sat committed but unapplied, so the live site served the old Sunday running order while the bundled fallback had the new one. After `supabase db push`, confirm the rows actually moved:

  ```sql
  select day, time_label, title, zone
  from public.schedule_events order by day, sort_order;
  ```
- **Icons**: regenerate with `python3 scripts/gen-icons.py`.
- **Bulk intake**: `scripts/import-registrations.mjs` turns the four registration
  spreadsheets into accounts, teams and a credentials CSV. Dry-run by default,
  idempotent, and it never emails anyone — passwords go to a `0600` file for the
  team to hand out. Re-running after a corrected sheet preserves every password
  already issued unless you pass `--reset-passwords`.
- **Placeholder names**: the executive and mentor sheets have no name column, so
  those accounts fall back to the email local part.
  `scripts/normalise-identities.mjs` derives real names where it safely can and
  prints the rest for a human; pass `--names=names.csv` (`email,full_name`) to
  settle them. It never guesses a login address — `--emails` is a separate flag
  and only ever touches high-confidence rows.
- **`NEXT_PUBLIC_SITE_URL` before printing badges**: the import withholds the
  `card_url` column while it points at localhost, because a badge that resolves
  to somebody's laptop is not discovered until it is scanned at the desk.

## Licence

© Code for Change / Codefest Nepal. All rights reserved.
