/*
 * Creates every account for Codefest 2026 Chitwan from the four registration
 * spreadsheets, links participants to their teams, and writes out the
 * credentials for the organisers to distribute.
 *
 *   node scripts/import-registrations.mjs --dry-run      # always do this first
 *   node scripts/import-registrations.mjs --commit
 *
 * Needs Node 22+ (supabase-js requires native WebSocket). Reads credentials
 * from .env.local, so it never carries a key of its own.
 *
 * NOTHING IS EMAILED. The app's createMember action mails a password over
 * SMTP; this does not, because SMTP is unconfigured and because a hundred
 * messages sent by an import script is not a thing that should be one flag
 * away. Passwords are written to a CSV (--out) for the team to mail-merge or
 * hand out at the desk. That file is plaintext credentials for real people:
 * it is written 0600, and it should be deleted once distributed.
 *
 * Idempotent. Re-running:
 *   - upserts teams by code,
 *   - leaves an existing account's password ALONE unless --reset-passwords,
 *   - re-applies role, team, title and the registration details either way.
 * So a corrected spreadsheet can be re-imported as many times as it needs to
 * be, without silently invalidating a password somebody already has.
 *
 * Expected inputs (override with the flags shown):
 *   --participants  Google Form export, one row per team, wide member blocks
 *   --executives    "email, portfolio title" per line, no header
 *   --volunteers    name,mail
 *   --judges        Role,Name,Email   (Mentor | Judge)
 */

import { readFileSync, writeFileSync, chmodSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

function loadEnv(file = ".env.local") {
  let raw;
  try {
    raw = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    process.env[match[1]] ??= match[2].trim().replace(/^["']|["']$/g, "");
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — copy .env.example to .env.local and fill them in.",
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const commit = args.includes("--commit");
const dryRun = !commit;
const resetPasswords = args.includes("--reset-passwords");

const DOWNLOADS = `${process.env.HOME}/Downloads`;
const paths = {
  participants: flag(
    "participants",
    `${DOWNLOADS}/CODEFEST 2026 - CFC Chitwan x Forbes college  (Responses) - Form Responses 1.csv`,
  ),
  executives: flag("executives", `${DOWNLOADS}/Untitled spreadsheet - Sheet1.csv`),
  volunteers: flag("volunteers", `${DOWNLOADS}/codefest_volunteers.csv`),
  judges: flag("judges", `${DOWNLOADS}/mentors_and_judges(1).csv`),
};
const outPath = flag("out", "codefest-2026-credentials.csv");

/* Identity-card QRs encode this origin, so a wrong value prints badges that
   resolve to the wrong host. Same variable the app reads. */
const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/+$/, "");

/*
 * A localhost card_url is worse than none: it prints a hundred badges that
 * resolve to somebody's laptop, and nobody notices until a volunteer scans one
 * at the desk on Friday. The accounts are still created — only the card column
 * is withheld — so the run is not wasted, and re-running once the domain is
 * set fills it in without touching a password.
 */
const cardUrlsUsable = !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(siteUrl);

const admin = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

/*
 * A small RFC-4180 reader: quoted fields, embedded commas and newlines,
 * escaped doubled quotes, CRLF. The Google Form export contains all four —
 * one header cell has a literal newline inside it.
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

function read(path) {
  try {
    return parseCsv(readFileSync(path, "utf8"));
  } catch (error) {
    console.error(`Could not read ${path}: ${error.message}`);
    process.exit(1);
  }
}

const clean = (value) => (value ?? "").trim();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Rejections are collected, never silently dropped: a participant missing from
   the roster discovers it at the registration desk on Friday morning. */
const problems = [];
function reject(who, why) {
  problems.push({ who, why });
  return null;
}

function validEmail(raw, who) {
  const email = clean(raw).toLowerCase();
  if (!email) return reject(who, "no email address given");
  if (!EMAIL_RE.test(email)) return reject(who, `"${email}" is not an email address`);
  if (email.endsWith(".con")) {
    return reject(who, `"${email}" looks like a .com typo — fix the spreadsheet`);
  }
  return email;
}

/**
 * "aayushas148@gmail.com" -> "Aayushas148"; only used when no name is given.
 *
 * Callers must record that the result was derived. The executive and mentor
 * sheets carry no name column at all, so every run produces one of these — and
 * without the flag, re-running would overwrite the real names that
 * normalise-identities.mjs (or a human) has since put in.
 */
function nameFromEmail(email) {
  const local = email.split("@")[0].replace(/[._-]+/g, " ").trim();
  return local.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Non-Vegeterian / Non-Vegetarian / Vegeterian all appear in the export. */
function normaliseFood(raw) {
  const value = clean(raw).toLowerCase();
  if (!value) return null;
  if (value.startsWith("non")) return "Non-vegetarian";
  if (value.startsWith("veg")) return "Vegetarian";
  return clean(raw);
}

/** "No" / "None" / "-" all mean nothing to record. */
function optionalNote(raw) {
  const value = clean(raw);
  if (!value) return null;
  if (/^(no|none|n\/a|na|-|nil)$/i.test(value)) return null;
  return value;
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

/** Google Form export: 10 team columns, then repeating 6-column member blocks. */
function readParticipants() {
  const rows = read(paths.participants);
  const width = rows[0].length;
  const teams = [];

  rows.slice(1).forEach((raw, index) => {
    const r = [...raw, ...Array(Math.max(0, width - raw.length)).fill("")];
    const teamName = clean(r[2]);
    if (!teamName) return;

    const code = `CFC-${String(index + 1).padStart(2, "0")}`;
    const institution = clean(r[7]) || null;

    const people = [];
    const leaderEmail = validEmail(r[4], `${teamName} leader "${clean(r[3])}"`);
    if (leaderEmail) {
      people.push({
        email: leaderEmail,
        full_name: clean(r[3]) || nameFromEmail(leaderEmail),
        name_derived: !clean(r[3]),
        phone: clean(r[5]) || null,
        food_preference: normaliseFood(r[8]),
        allergy: null,
        medical_note: null,
        title: "Team Leader",
      });
    }

    for (let start = 10; start + 5 < width; start += 6) {
      const name = clean(r[start]);
      const rawEmail = clean(r[start + 1]);
      if (!name && !rawEmail) continue;

      const email = validEmail(rawEmail, `${teamName} member "${name || rawEmail}"`);
      if (!email) continue;

      people.push({
        email,
        full_name: name || nameFromEmail(email),
        name_derived: !name,
        phone: null,
        food_preference: normaliseFood(r[start + 3]),
        allergy: optionalNote(r[start + 4]),
        medical_note: optionalNote(r[start + 5]),
        title: null,
      });
    }

    teams.push({ code, name: teamName, institution, people });
  });

  return teams;
}

/** No header, quoting is mangled: ""email"" , Portfolio Title */
function readExecutives() {
  const raw = readFileSync(paths.executives, "utf8");
  const people = [];

  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    const [emailPart, ...rest] = line.split(",");
    const email = validEmail(
      emailPart.replace(/"/g, ""),
      `executive line "${line.trim().slice(0, 40)}"`,
    );
    if (!email) continue;

    const title = clean(rest.join(",").replace(/"/g, "")) || null;
    people.push({
      email,
      full_name: nameFromEmail(email),
      // The executives sheet has no name column at all.
      name_derived: true,
      role: "executive",
      title,
    });
  }

  return people;
}

/** name,mail */
function readVolunteers() {
  const rows = read(paths.volunteers);
  return rows
    .slice(1)
    .map(([name, mail]) => {
      const email = validEmail(mail, `volunteer "${clean(name)}"`);
      if (!email) return null;
      return {
        email,
        full_name: clean(name) || nameFromEmail(email),
        name_derived: !clean(name),
        role: "volunteer",
        title: null,
      };
    })
    .filter(Boolean);
}

/** Role,Name,Email where Role is Mentor or Judge. */
function readJudgesAndMentors() {
  const rows = read(paths.judges);
  return rows
    .slice(1)
    .map(([roleRaw, name, mail]) => {
      const role = clean(roleRaw).toLowerCase();
      if (role !== "mentor" && role !== "judge") {
        return reject(`row "${clean(roleRaw)},${clean(name)}"`, "unknown role");
      }
      const email = validEmail(mail, `${role} "${clean(name) || clean(mail)}"`);
      if (!email) return null;
      return {
        email,
        full_name: clean(name) || nameFromEmail(email),
        name_derived: !clean(name),
        role,
        title: null,
      };
    })
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Account creation
// ---------------------------------------------------------------------------

/*
 * 14 characters from a 32-symbol alphabet, no look-alikes. These get read off
 * a printout and typed on a phone keyboard at a registration desk, so 0/O and
 * 1/l/I are excluded and the whole thing is lower case.
 */
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
function generatePassword() {
  const bytes = randomBytes(14);
  let out = "";
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length];
  return `${out.slice(0, 4)}-${out.slice(4, 9)}-${out.slice(9)}`;
}

/**
 * Auth admin has no get-by-email, so page the user list once and index it.
 *
 * Also indexes the address a profile *used* to have. normalise-identities.mjs
 * can move an organiser from their gmail to a codefestchitwan.com login and
 * records the old one in profiles.notes; without this second index, the next
 * run of this script would fail to find them by the address still sitting in
 * the spreadsheet and would cheerfully create a duplicate account.
 */
async function loadExistingUsers() {
  const byEmail = new Map();
  for (let page = 1; page <= 30; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    for (const user of data.users) {
      if (user.email) byEmail.set(user.email.toLowerCase(), user);
    }
    if (data.users.length < 200) break;
  }

  const { data: moved } = await admin
    .from("profiles")
    .select("id, email, notes")
    .not("notes", "is", null);

  for (const profile of moved ?? []) {
    const previous = /^Previously (.+)$/.exec(profile.notes ?? "");
    if (!previous) continue;
    const current = byEmail.get((profile.email ?? "").toLowerCase());
    if (current) byEmail.set(previous[1].toLowerCase(), current);
  }

  return byEmail;
}

const results = [];

async function upsertAccount(person, existingUsers, teamId = null, teamName = null) {
  const existing = existingUsers.get(person.email);
  const password =
    existing && !resetPasswords ? null : generatePassword();

  const record = {
    email: person.email,
    full_name: person.full_name,
    role: person.role,
    title: person.title ?? null,
    team: teamName,
    password,
    // Filled in after the profile exists — the token is generated by the
    // table default, so it is not known until the row has been written.
    card_url: null,
    status: existing ? (resetPasswords ? "password reset" : "existing, kept") : "created",
  };

  if (dryRun) {
    results.push(record);
    return;
  }

  let userId = existing?.id;

  if (!existing) {
    const { data, error } = await admin.auth.admin.createUser({
      email: person.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: person.full_name, role: person.role },
    });
    if (error) {
      problems.push({ who: person.email, why: `could not create account: ${error.message}` });
      return;
    }
    userId = data.user.id;
  } else if (resetPasswords) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, { password });
    if (error) {
      problems.push({ who: person.email, why: `could not reset password: ${error.message}` });
      return;
    }
  }

  // The handle_new_user trigger made the profile; this makes it match the
  // spreadsheet exactly, and re-applies on every run so a corrected sheet wins.
  const patch = {
    role: person.role,
    title: person.title ?? null,
    team_id: teamId,
  };

  /*
   * A name the spreadsheet actually supplied always wins. A name we invented
   * from the address is only written when the account is new — otherwise every
   * re-run would stamp "Subedinirajan15" back over the real name a human, or
   * normalise-identities.mjs, has since corrected.
   */
  if (!person.name_derived || !existing) {
    patch.full_name = person.full_name;
  }
  if (person.phone !== undefined) patch.phone = person.phone ?? null;
  if (person.institution !== undefined) patch.institution = person.institution ?? null;
  if (person.food_preference !== undefined) patch.food_preference = person.food_preference ?? null;
  if (person.allergy !== undefined) patch.allergy = person.allergy ?? null;
  if (person.medical_note !== undefined) patch.medical_note = person.medical_note ?? null;
  if (password) patch.must_change_password = true;

  const { data: updated, error: profileError } = await admin
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select("qr_token")
    .single();

  if (profileError) {
    problems.push({ who: person.email, why: `profile update failed: ${profileError.message}` });
    return;
  }

  // The same URL the in-app identity card encodes, so a badge printed from
  // this sheet and a phone screen scan identically at the desk.
  if (updated?.qr_token && cardUrlsUsable) {
    record.card_url = `${siteUrl}/verify/${updated.qr_token}`;
  }

  results.push(record);
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const teams = readParticipants();
const executives = readExecutives();
const volunteers = readVolunteers();
const panel = readJudgesAndMentors();

const participantCount = teams.reduce((sum, t) => sum + t.people.length, 0);

console.log(`\nCodefest 2026 — registration intake  ${dryRun ? "(DRY RUN)" : "(COMMITTING)"}`);
console.log("=".repeat(64));
console.log(`teams              ${teams.length}`);
console.log(`participants       ${participantCount}`);
console.log(`executives         ${executives.length}`);
console.log(`volunteers         ${volunteers.length}`);
console.log(`mentors + judges   ${panel.length}`);
console.log(`accounts total     ${participantCount + executives.length + volunteers.length + panel.length}`);

// A duplicate address across two roles would have the second role silently win.
const everyEmail = [
  ...teams.flatMap((t) => t.people.map((p) => p.email)),
  ...executives.map((p) => p.email),
  ...volunteers.map((p) => p.email),
  ...panel.map((p) => p.email),
];
const seen = new Set();
for (const email of everyEmail) {
  if (seen.has(email)) problems.push({ who: email, why: "appears in more than one sheet" });
  seen.add(email);
}

if (problems.length > 0) {
  console.log(`\nSKIPPED / NEEDS ATTENTION (${problems.length})`);
  console.log("-".repeat(64));
  for (const { who, why } of problems) console.log(`  ${who}\n      ${why}`);
  console.log(
    "\nThese people get no account. Fix the spreadsheet and re-run — the import\n" +
      "is idempotent, so everyone already created keeps the password they have.",
  );
}

const existingUsers = dryRun ? new Map() : await loadExistingUsers();

for (const team of teams) {
  let teamId = null;

  if (!dryRun) {
    const { data: existingTeam } = await admin
      .from("teams")
      .select("id")
      .ilike("code", team.code)
      .maybeSingle();

    if (existingTeam) {
      teamId = existingTeam.id;
      await admin
        .from("teams")
        .update({ name: team.name, institution: team.institution })
        .eq("id", teamId);
    } else {
      const { data: created, error } = await admin
        .from("teams")
        .insert({ code: team.code, name: team.name, institution: team.institution })
        .select("id")
        .single();
      if (error) {
        problems.push({ who: team.code, why: `could not create team: ${error.message}` });
        continue;
      }
      teamId = created.id;
    }
  }

  for (const person of team.people) {
    await upsertAccount(
      { ...person, role: "participant", institution: team.institution },
      existingUsers,
      teamId,
      team.name,
    );
  }
}

for (const person of [...executives, ...volunteers, ...panel]) {
  await upsertAccount(person, existingUsers);
}

// ---------------------------------------------------------------------------
// Credentials file
// ---------------------------------------------------------------------------

const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const header = [
  "full_name", "email", "role", "title", "team", "password", "card_url", "status",
];
const lines = [header.map(cell).join(",")];
for (const r of results) {
  lines.push(
    [r.full_name, r.email, r.role, r.title, r.team, r.password ?? "", r.card_url ?? "", r.status]
      .map(cell)
      .join(","),
  );
}

if (dryRun) {
  console.log(`\nWould write ${results.length} rows to ${outPath}`);
  console.log("Nothing was written. Re-run with --commit to create the accounts.\n");
} else {
  writeFileSync(outPath, `﻿${lines.join("\r\n")}\r\n`);
  chmodSync(outPath, 0o600);
  console.log(`\nWrote ${results.length} rows to ${outPath} (mode 0600).`);

  if (!cardUrlsUsable) {
    console.log(
      `\n  !! card_url is EMPTY: NEXT_PUBLIC_SITE_URL is "${siteUrl}".\n` +
        "     Badges printed from that would resolve to a laptop. Set the public\n" +
        "     origin in .env.local and re-run — passwords are preserved unless\n" +
        "     you pass --reset-passwords, so only the card column changes.",
    );
  }
  console.log(
    "This file contains plaintext passwords for real people. Distribute it,\n" +
      "then delete it. It is already covered by .gitignore.\n",
  );
}
