/**
 * Stamps profiles.participant_code — "CFC-07-3" — from the prepared
 * registration CSV.
 *
 * The codes are derived from the spreadsheet rather than from the database on
 * purpose. Seat order is a fact about how the team filled in the form: the
 * leader first, then their members in the order they listed them. The database
 * does not record that order — created_at is an artefact of import batching,
 * and sorting by name would reshuffle a team every time somebody's name is
 * corrected. The spreadsheet is also the artefact an organiser can point at
 * when a participant asks why they are number 3.
 *
 * Consequences worth knowing:
 *   - Seat 1 is always the team leader.
 *   - Re-running against the same CSV is a no-op; it is safe to run repeatedly.
 *   - Re-running against a CSV with a member *inserted* mid-team renumbers
 *     everyone below them in that team. Append, don't insert, once printed.
 *
 * Staff have no team and keep a null code; they are not touched.
 *
 * Usage: node scripts/assign-participant-codes.mjs [--in FILE] [--commit]
 */

import fs from "node:fs";
import { serviceClient } from "./lib/supabase.mjs";

function flag(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const IN_PATH = flag("in", "codefest-2026-registrations.csv");
const commit = process.argv.includes("--commit");

const MEMBER_BASE = 10;
const MEMBER_STRIDE = 6;
const COL = { teamName: 2, leaderName: 3, leaderEmail: 4 };

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

/** RFC 4180, same shape as the parser in the import scripts. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += ch;
      continue;
    }

    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") cell += ch;
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => clean(c)));
}

/** Walks the form layout in seat order: leader first, then listed members. */
function readSeats(rows) {
  const seats = [];

  rows.slice(1).forEach((row, index) => {
    const teamName = clean(row[COL.teamName]);
    if (!teamName) return;

    const code = `CFC-${String(index + 1).padStart(2, "0")}`;
    const people = [
      { name: clean(row[COL.leaderName]), email: clean(row[COL.leaderEmail]) },
    ];

    for (
      let start = MEMBER_BASE;
      start + MEMBER_STRIDE - 1 < row.length;
      start += MEMBER_STRIDE
    ) {
      const name = clean(row[start]);
      const email = clean(row[start + 1]);
      if (!name && !email) continue;
      people.push({ name, email });
    }

    people.forEach((person, seat) => {
      if (!person.email) return;
      seats.push({
        code: `${code}-${seat + 1}`,
        teamCode: code,
        teamName,
        name: person.name,
        email: person.email.toLowerCase(),
        isLeader: seat === 0,
      });
    });
  });

  return seats;
}

async function main() {
  const supabase = serviceClient();
  const seats = readSeats(parseCsv(fs.readFileSync(IN_PATH, "utf8")));

  const duplicates = seats.filter(
    (s, i) => seats.findIndex((o) => o.email === s.email) !== i,
  );
  if (duplicates.length) {
    console.error("The CSV lists one address twice — fix it before assigning:");
    for (const d of duplicates) console.error(`  ${d.email}  (${d.code})`);
    process.exit(1);
  }

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, participant_code, role");
  if (error) throw new Error(error.message);

  const byEmail = new Map(profiles.map((p) => [p.email.toLowerCase(), p]));

  const changes = [];
  const unchanged = [];
  const missing = [];

  for (const seat of seats) {
    const profile = byEmail.get(seat.email);
    if (!profile) {
      missing.push(seat);
      continue;
    }
    if (profile.participant_code === seat.code) unchanged.push(seat);
    else changes.push({ seat, profile });
  }

  console.log(`\nParticipant codes${commit ? "" : "  (DRY RUN)"}`);
  console.log("================================================================");
  console.log(`seats in CSV       ${seats.length}`);
  console.log(`already correct    ${unchanged.length}`);
  console.log(`to write           ${changes.length}`);
  console.log(`no account yet     ${missing.length}`);

  if (changes.length) {
    console.log("\nAssigning:");
    for (const { seat, profile } of changes) {
      const from = profile.participant_code
        ? `${profile.participant_code} -> `
        : "";
      console.log(
        `  ${from}${seat.code.padEnd(10)} ${profile.full_name}${seat.isLeader ? "  (Team Leader)" : ""}`,
      );
    }
  }

  if (missing.length) {
    console.log("\nNo account for these — run import-registrations.mjs first:");
    for (const seat of missing) {
      console.log(`  ${seat.code.padEnd(10)} ${seat.name || "?"}  <${seat.email}>`);
    }
  }

  // A code left on somebody no longer in the spreadsheet would collide the
  // next time that seat is handed out.
  const wanted = new Set(seats.map((s) => s.code));
  const stale = profiles.filter(
    (p) => p.participant_code && !wanted.has(p.participant_code),
  );
  if (stale.length) {
    console.log("\nStale codes to clear (not a seat in this CSV):");
    for (const p of stale) console.log(`  ${p.participant_code}  ${p.full_name}`);
  }

  if (!commit) {
    console.log("\nNothing was written. Re-run with --commit.");
    return;
  }

  // Clear first: a seat that moved between people would otherwise trip the
  // unique index halfway through.
  for (const p of stale) {
    const { error: clearError } = await supabase
      .from("profiles")
      .update({ participant_code: null })
      .eq("id", p.id);
    if (clearError) throw new Error(`${p.full_name}: ${clearError.message}`);
  }

  for (const { seat, profile } of changes) {
    const { error: writeError } = await supabase
      .from("profiles")
      .update({ participant_code: seat.code })
      .eq("id", profile.id);
    if (writeError) throw new Error(`${profile.full_name}: ${writeError.message}`);
  }

  console.log(
    `\nWrote ${changes.length} ${changes.length === 1 ? "code" : "codes"}${stale.length ? `, cleared ${stale.length}` : ""}.`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
