/*
 * Imports the pre-formed team roster from a CSV export of the organisers'
 * spreadsheet.
 *
 *   node scripts/import-teams.mjs teams.csv --dry-run    # always do this first
 *   node scripts/import-teams.mjs teams.csv
 *
 * Needs Node 22+ (supabase-js requires native WebSocket). Reads credentials
 * from .env.local, so it never carries a key of its own.
 *
 * Idempotent: re-running upserts teams by code and re-points members, so the
 * roster can be corrected as many times as it needs to be on the night before.
 *
 * PRECEDENCE — read this before re-running after Friday. `table_number` is
 * owned by the draw at /admin/wheel; a CSV value only fills a blank, and the
 * run prints a line for every team whose CSV value was ignored. `room` stays
 * CSV-authoritative because the organisers allocate rooms.
 *
 * Expected columns (header row required, order does not matter, extras are
 * ignored). Only team_code, team_name and member_email are mandatory:
 *
 *   team_code,team_name,institution,track,room,table_number,member_email
 *   CFC-014,Byte Force,Forbes College,Fintech,C-201,14,anisha@example.com
 *   CFC-014,Byte Force,Forbes College,Fintech,C-201,14,rajan@example.com
 *
 * One row per member. Rows sharing a team_code must agree on team_name, or the
 * whole run is refused before anything is written.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    process.env[match[1]] ??= value;
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

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const csvPath = args.find((arg) => !arg.startsWith("--"));

if (!csvPath) {
  console.error("Usage: node scripts/import-teams.mjs <roster.csv> [--dry-run]");
  process.exit(1);
}

const admin = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/*
 * A small RFC-4180 reader: handles quoted fields, embedded commas, escaped
 * doubled quotes and CRLF. Spreadsheet exports contain all four, and pulling
 * in a dependency three days before the event is not worth it.
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

function readRoster(path) {
  const rows = parseCsv(readFileSync(path, "utf8"));
  if (rows.length < 2) {
    throw new Error("The CSV needs a header row and at least one member row.");
  }

  const header = rows[0].map((name) => name.trim().toLowerCase());
  const required = ["team_code", "team_name", "member_email"];
  const missing = required.filter((name) => !header.includes(name));
  if (missing.length > 0) {
    throw new Error(`Missing required column(s): ${missing.join(", ")}`);
  }

  const pick = (row, name) => {
    const index = header.indexOf(name);
    return index === -1 ? "" : (row[index] ?? "").trim();
  };

  return rows.slice(1).map((row, index) => ({
    line: index + 2,
    code: pick(row, "team_code").toUpperCase(),
    name: pick(row, "team_name"),
    institution: pick(row, "institution") || null,
    track: pick(row, "track") || null,
    room: pick(row, "room") || null,
    tableNumber: pick(row, "table_number") || null,
    email: pick(row, "member_email").toLowerCase(),
  }));
}

/* -------------------------------------------------------------------------- */

async function main() {
  const entries = readRoster(csvPath);

  // Group into teams, refusing contradictory names before touching the DB.
  const teams = new Map();
  const problems = [];

  for (const entry of entries) {
    if (!entry.code) problems.push(`line ${entry.line}: empty team_code`);
    if (!entry.name) problems.push(`line ${entry.line}: empty team_name`);
    if (!entry.email || !entry.email.includes("@")) {
      problems.push(`line ${entry.line}: invalid member_email "${entry.email}"`);
    }
    if (!entry.code || !entry.name) continue;

    const existing = teams.get(entry.code);
    if (!existing) {
      teams.set(entry.code, {
        code: entry.code,
        name: entry.name,
        institution: entry.institution,
        track: entry.track,
        room: entry.room,
        table_number: entry.tableNumber,
        emails: [entry.email],
      });
      continue;
    }

    if (existing.name.trim().toLowerCase() !== entry.name.trim().toLowerCase()) {
      problems.push(
        `line ${entry.line}: team ${entry.code} is "${entry.name}" here but "${existing.name}" earlier`,
      );
    }
    if (entry.email) existing.emails.push(entry.email);
  }

  if (problems.length > 0) {
    console.error(`\nRefusing to import — ${problems.length} problem(s):\n`);
    for (const problem of problems) console.error(`  · ${problem}`);
    console.error("\nFix the CSV and run again. Nothing was written.\n");
    process.exit(1);
  }

  const allEmails = [...new Set(entries.map((entry) => entry.email))];

  // Which of these people actually have an account yet?
  const { data: existingProfiles, error: profileError } = await admin
    .from("profiles")
    .select("id, email, team_id")
    .in("email", allEmails);

  if (profileError) {
    console.error(`Could not read profiles: ${profileError.message}`);
    process.exit(1);
  }

  const byEmail = new Map(
    (existingProfiles ?? []).map((row) => [row.email.toLowerCase(), row]),
  );
  const unmatched = allEmails.filter((email) => !byEmail.has(email));

  console.log(
    `\n${dryRun ? "DRY RUN — nothing will be written" : "Importing"}: ` +
      `${teams.size} team(s), ${allEmails.length} member(s)\n`,
  );

  for (const team of teams.values()) {
    const known = team.emails.filter((email) => byEmail.has(email)).length;
    console.log(
      `  ${team.code.padEnd(10)} ${team.name.padEnd(28)} ` +
        `${team.emails.length} member(s), ${known} with an account`,
    );
  }

  if (dryRun) {
    reportUnmatched(unmatched);
    console.log("Dry run complete. Re-run without --dry-run to apply.\n");
    return;
  }

  // 1. Upsert teams by code.
  const { data: savedTeams, error: teamError } = await admin
    .from("teams")
    .upsert(
      // table_number is deliberately absent: from Friday's draw onward the
      // wheel owns it, and an unconditional upsert here would silently wipe
      // it. It is filled below, but only where it is still blank.
      [...teams.values()].map((team) => ({
        code: team.code,
        name: team.name,
        institution: team.institution,
        track: team.track,
        room: team.room,
      })),
      { onConflict: "code" },
    )
    .select("id, code");

  if (teamError) {
    console.error(`\nCould not save teams: ${teamError.message}\n`);
    process.exit(1);
  }

  const teamIdByCode = new Map(
    (savedTeams ?? []).map((team) => [team.code.toUpperCase(), team.id]),
  );

  // Table numbers: the CSV may only fill a blank. Whatever /admin/wheel drew
  // wins, so re-running this on Saturday to fix a roster typo cannot destroy
  // Friday's draw. Same shape as the room rule below.
  for (const team of teams.values()) {
    const teamId = teamIdByCode.get(team.code);
    if (!teamId || !team.table_number) continue;

    const { data: filled } = await admin
      .from("teams")
      .update({ table_number: team.table_number })
      .eq("id", teamId)
      .is("table_number", null)
      .select("id");

    if (!filled?.length) {
      console.log(
        `  · ${team.code}: kept the drawn table number, CSV value ignored`,
      );
    }
  }

  // 2. Point each existing profile at its team. Matched on profile id rather
  //    than email, so stored casing cannot cause a silent zero-row update.
  //    profiles.team_name is a cache maintained by a database trigger, so it is
  //    deliberately not written here.
  let linked = 0;
  for (const team of teams.values()) {
    const teamId = teamIdByCode.get(team.code);
    if (!teamId) continue;

    const ids = team.emails
      .map((email) => byEmail.get(email)?.id)
      .filter((id) => id !== undefined);
    if (ids.length === 0) continue;

    const { error } = await admin
      .from("profiles")
      .update({ team_id: teamId })
      .in("id", ids);

    if (error) {
      console.error(`  ! ${team.code}: ${error.message}`);
      continue;
    }
    linked += ids.length;

    // Fill in the room from the team where the profile has none of its own.
    if (team.room) {
      await admin
        .from("profiles")
        .update({ room: team.room })
        .in("id", ids)
        .is("room", null);
    }
  }

  // 3. Keep the pre-approved registration list consistent.
  for (const team of teams.values()) {
    if (team.emails.length === 0) continue;
    await admin
      .from("registrations")
      .update({ team_name: team.name })
      .in("email", team.emails);
  }

  console.log(
    `\nDone. ${teamIdByCode.size} team(s) saved, ${linked} member(s) linked.`,
  );
  reportUnmatched(unmatched);
}

function reportUnmatched(unmatched) {
  if (unmatched.length === 0) {
    console.log("\nEvery member on the roster already has an account.\n");
    return;
  }
  console.log(
    `\n${unmatched.length} roster member(s) have NO account yet — the desk must ` +
      "create these in /admin/members before they can sign in:\n",
  );
  for (const email of unmatched) console.log(`  · ${email}`);
  console.log("");
}

main().catch((error) => {
  console.error(`\n${error.message}\n`);
  process.exit(1);
});
