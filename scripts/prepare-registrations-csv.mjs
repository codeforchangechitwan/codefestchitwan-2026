/**
 * Turns the Google Form xlsx export into the CSV that import-registrations.mjs
 * reads, repairing the things a public form lets people type wrong.
 *
 * Why this is a separate script rather than logic inside the importer: the
 * importer is already proven against the live event data and its team codes are
 * positional (`CFC-` + row number). Anything that changes which rows exist, or
 * what order they are in, silently renumbers teams that are already printed on
 * slips and already in the database. That decision deserves its own step, with
 * its own printed audit trail, run before anybody touches Supabase.
 *
 * Three classes of repair, all of them general rules rather than a list of
 * names, and every one of them logged:
 *
 *   1. A team that submitted the form twice. The earlier row wins its position,
 *      so codes never shift; the later row is folded into it field by field.
 *   2. An email cell that is not an email, or is a ".con" typo.
 *   3. Two different people sharing one address — one of them cannot own it.
 *
 * The merge rule for a re-submitted team is the interesting one. A leader
 * re-filling the form for their team usually does it to correct addresses they
 * guessed at the first time, but not always: some cells get *worse*, replaced
 * by a bare first name at a common provider. So the newer address is adopted
 * only when it is more specific than the older one (see emailSpecificity).
 *
 * Nothing here writes to the database, and nothing here is destructive: it
 * reads one xlsx and writes one CSV.
 *
 * Usage: node scripts/prepare-registrations-csv.mjs [--in FILE] [--out FILE]
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { readSheetRows } from "./lib/xlsx.mjs";

function flag(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const IN_PATH = flag(
  "in",
  path.join(
    os.homedir(),
    "Downloads",
    "CODEFEST 2026 - CFC Chitwan x Forbes college  (Responses) (1).xlsx",
  ),
);
const OUT_PATH = flag("out", "codefest-2026-registrations.csv");

/**
 * RFC 2606 reserves .invalid precisely so that a placeholder can never be
 * routed anywhere by accident. Overridable because the account still has to be
 * created in Supabase, and a provider that validates the TLD would reject it.
 */
const PLACEHOLDER_DOMAIN = flag("placeholder-domain", "codefestchitwan.invalid");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // same shape the importer accepts

// Column layout of the form export -----------------------------------------
const COL = {
  teamName: 2,
  leaderName: 3,
  leaderEmail: 4,
  phone: 5,
  institution: 7,
  leaderFood: 8,
};
const MEMBER_BASE = 10;
const MEMBER_STRIDE = 6; // name, email, id card, food, allergy, medical note

const log = [];
function note(kind, message) {
  log.push({ kind, message });
}

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const teamKey = (name) => clean(name).toLowerCase();
const personKey = (name) => clean(name).toLowerCase();

/**
 * 0 when the local part is just the person's first name — the shape of an
 * address typed in to get past a required field. 1 when it carries anything
 * more. Used only to choose between two addresses for the same person.
 */
function emailSpecificity(email, fullName) {
  const strip = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const local = strip(email.split("@")[0] ?? "");
  const first = strip(clean(fullName).split(" ")[0] ?? "");
  return first && local === first ? 0 : 1;
}

function placeholderFor(fullName, code) {
  const slug =
    clean(fullName)
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .split(" ")
      .filter(Boolean)
      .join(".") || "participant";
  return `${slug}.${code.replace(/-/g, "").toLowerCase()}@${PLACEHOLDER_DOMAIN}`;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

function parseRow(row) {
  const members = [];
  for (
    let start = MEMBER_BASE;
    start + MEMBER_STRIDE - 1 < row.length;
    start += MEMBER_STRIDE
  ) {
    const name = clean(row[start]);
    const email = clean(row[start + 1]);
    if (!name && !email) continue;
    members.push({
      name,
      email,
      idCard: clean(row[start + 2]),
      food: clean(row[start + 3]),
      allergy: clean(row[start + 4]),
      medical: clean(row[start + 5]),
    });
  }

  return {
    raw: row,
    teamName: clean(row[COL.teamName]),
    institution: clean(row[COL.institution]),
    leader: {
      name: clean(row[COL.leaderName]),
      email: clean(row[COL.leaderEmail]),
      phone: clean(row[COL.phone]),
      food: clean(row[COL.leaderFood]),
    },
    members,
  };
}

// ---------------------------------------------------------------------------
// Repairs
// ---------------------------------------------------------------------------

/** Folds a re-submission into the row that already holds the team's position. */
function mergeTeams(kept, later) {
  if (!kept.institution && later.institution) kept.institution = later.institution;
  if (!kept.leader.phone && later.leader.phone) {
    kept.leader.phone = later.leader.phone;
  }

  const consider = (person, incomingEmail, label) => {
    if (!incomingEmail || incomingEmail === person.email) return;
    const now = emailSpecificity(person.email, person.name);
    const next = emailSpecificity(incomingEmail, person.name);
    if (!person.email || next > now) {
      note(
        "merge",
        `${kept.teamName}: ${label} ${person.email || "(blank)"} -> ${incomingEmail} (re-submission is more specific)`,
      );
      person.email = incomingEmail;
    } else {
      note(
        "merge",
        `${kept.teamName}: ${label} kept ${person.email}, ignored ${incomingEmail} (re-submission is less specific)`,
      );
    }
  };

  if (personKey(later.leader.name) === personKey(kept.leader.name)) {
    consider(kept.leader, later.leader.email, `leader ${kept.leader.name}`);
  }

  for (const incoming of later.members) {
    const match = kept.members.find(
      (m) => personKey(m.name) === personKey(incoming.name),
    );
    if (match) {
      consider(match, incoming.email, match.name);
      if (!match.allergy && incoming.allergy) match.allergy = incoming.allergy;
      if (!match.medical && incoming.medical) match.medical = incoming.medical;
    } else {
      note("merge", `${kept.teamName}: added ${incoming.name} from the re-submission`);
      kept.members.push(incoming);
    }
  }
}

/** .con -> .com, non-addresses and shared addresses -> reserved placeholders. */
function repairEmails(teams) {
  const owner = new Map(); // email -> "who holds it"

  for (const team of teams) {
    const people = [
      { person: team.leader, label: `${team.teamName} leader ${team.leader.name}` },
      ...team.members.map((m) => ({
        person: m,
        label: `${team.teamName} member ${m.name}`,
      })),
    ];

    for (const { person, label } of people) {
      const before = person.email;

      if (/\.con$/i.test(person.email)) {
        person.email = person.email.replace(/\.con$/i, ".com");
        note("fix", `${label}: ${before} -> ${person.email} (.con typo)`);
      }

      if (!EMAIL_RE.test(person.email)) {
        person.email = placeholderFor(person.name, team.code);
        note(
          "placeholder",
          `${label}: "${before}" is not an address -> ${person.email} — confirm at the desk`,
        );
      }

      const key = person.email.toLowerCase();
      const held = owner.get(key);
      if (held && held !== label) {
        const minted = placeholderFor(person.name, team.code);
        note(
          "placeholder",
          `${label}: ${person.email} already belongs to ${held} -> ${minted} — confirm at the desk`,
        );
        person.email = minted;
      }
      owner.set(person.email.toLowerCase(), label);
    }
  }
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const csvRow = (cells) => cells.map(csvCell).join(",");

function serialise(team, width) {
  const row = new Array(width).fill("");
  row[COL.teamName] = team.teamName;
  row[COL.leaderName] = team.leader.name;
  row[COL.leaderEmail] = team.leader.email;
  row[COL.phone] = team.leader.phone;
  row[COL.institution] = team.institution;
  row[COL.leaderFood] = team.leader.food;

  team.members.forEach((m, i) => {
    const start = MEMBER_BASE + i * MEMBER_STRIDE;
    if (start + MEMBER_STRIDE - 1 >= width) return;
    row[start] = m.name;
    row[start + 1] = m.email;
    row[start + 2] = m.idCard;
    row[start + 3] = m.food;
    row[start + 4] = m.allergy;
    row[start + 5] = m.medical;
  });

  return row;
}

// ---------------------------------------------------------------------------

async function main() {
  const rows = await readSheetRows(IN_PATH);
  if (rows.length < 2) throw new Error(`${IN_PATH} has no responses`);

  const header = rows[0];
  const responses = rows.slice(1).map(parseRow).filter((t) => t.teamName);

  // Dedupe first: codes are positional, so this has to settle before anything
  // downstream can name a team.
  const teams = [];
  const byName = new Map();
  for (const team of responses) {
    const key = teamKey(team.teamName);
    const existing = byName.get(key);
    if (existing) {
      note(
        "duplicate",
        `${team.teamName} submitted the form twice — folding the later response into ${existing.code}`,
      );
      mergeTeams(existing, team);
      continue;
    }
    team.code = `CFC-${String(teams.length + 1).padStart(2, "0")}`;
    teams.push(team);
    byName.set(key, team);
  }

  repairEmails(teams);

  const width = header.length;
  const out = [csvRow(header), ...teams.map((t) => csvRow(serialise(t, width)))];
  fs.writeFileSync(OUT_PATH, `${out.join("\r\n")}\r\n`, "utf8");

  // Report -------------------------------------------------------------
  const headcount = teams.reduce((n, t) => n + 1 + t.members.length, 0);
  console.log(`Read     ${responses.length} responses from ${path.basename(IN_PATH)}`);
  console.log(`Teams    ${teams.length}  (${teams[0].code} .. ${teams.at(-1).code})`);
  console.log(`People   ${headcount}\n`);

  for (const team of teams) {
    console.log(
      `  ${team.code}  ${team.teamName} — ${team.institution || "no college given"}  (${1 + team.members.length})`,
    );
  }

  if (log.length) {
    console.log("\nRepairs applied:");
    for (const { kind, message } of log) {
      console.log(`  [${kind}] ${message}`);
    }
  }

  const flagged = log.filter((l) => l.kind === "placeholder").length;
  console.log(`\nWrote ${OUT_PATH}`);
  if (flagged) {
    console.log(
      `${flagged} ${flagged === 1 ? "person needs" : "people need"} their real address confirmed at the desk.`,
    );
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
