/*
 * Turns email-derived placeholder names into real names, and optionally issues
 * organisation addresses at codefestchitwan.com.
 *
 *   node scripts/normalise-identities.mjs                    # dry run, review table
 *   node scripts/normalise-identities.mjs --commit           # apply names only
 *   node scripts/normalise-identities.mjs --commit --emails  # also change logins
 *   node scripts/normalise-identities.mjs --names names.csv  # authoritative input
 *
 * Why this exists: the executive and mentor spreadsheets have no name column,
 * so the import fell back to the email local part. "Rtsoftwaredeveloper07" is
 * what currently prints on that person's badge.
 *
 * WHAT THIS WILL NOT DO
 * ---------------------
 * Guess. A local part is not a name — it is a string someone picked in year
 * nine. `subedinirajan15@gmail.com` belongs to Nirajan Subedi, surname first;
 * naive splitting yields "Subedi Nirajan" and puts it on a badge backwards.
 * `bhattaram611` could be Bhattarai Ram or Bhatta Ram. `rtsoftwaredeveloper07`
 * contains no name at all.
 *
 * So every derivation carries a confidence, only `high` is applied, and
 * everything else is printed for a human. Pass --names with a
 * `email,full_name` CSV to override the heuristic entirely; that file always
 * wins and is the intended way to finish the job.
 *
 * CHANGING A LOGIN EMAIL IS DESTRUCTIVE. It is the credential the person was
 * handed on the printed sheet. --emails is therefore separate from --commit,
 * only ever touches `high` confidence rows, and records the previous address
 * in profiles.notes so a locked-out organiser can be traced on Friday morning.
 */

import { readFileSync, writeFileSync, chmodSync } from "node:fs";
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
    process.env[match[1]] ??= match[2].trim().replace(/^["']|["']$/g, "");
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRole) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const args = process.argv.slice(2);
const commit = args.includes("--commit");
const changeEmails = args.includes("--emails");
const namesFlag = args.find((a) => a.startsWith("--names="));
const ORG_DOMAIN = "codefestchitwan.com";

const admin = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Name knowledge
// ---------------------------------------------------------------------------

/*
 * Surnames seen across these four spreadsheets plus the common Nepali set.
 * Used only to find the boundary between given name and surname — a local part
 * that ends OR begins with one of these can be split with some confidence,
 * because Nepali rosters write the order both ways.
 */
const SURNAMES = [
  "acharya", "adhikari", "amgain", "atreya", "bagale", "bastakoti", "bhandari",
  "bhatta", "bhattarai", "bhusal", "chapagain", "chaudhary", "dahal", "dawadi",
  "devkota", "dhakal", "dhungana", "gaire", "gautam", "ghimire", "giri",
  "gyawali", "joshi", "kadariya", "kafle", "kandel", "karki", "katwal", "khadka",
  "khanal", "khand", "koirala", "kunwar", "lamichhane", "magar", "mahato",
  "maharjan", "manandhar", "nepal", "nepali", "neupane", "oza", "ojha",
  "pandey", "pandit", "pangeni", "panta", "parajuli", "pathak", "paudel",
  "pokhrel", "poudel", "poudyal", "rai", "raut", "regmi", "rijal", "sapkota",
  "shah", "shahi", "sharma", "shrestha", "sigdel", "sodari", "subedi", "sunar",
  "tamang", "thapa", "timalsina", "timilsina", "tiwari", "upadhyay", "wagle",
];

/*
 * Tokens that prove the local part is a handle rather than a name. Any hit and
 * the row is refused outright — no amount of splitting rescues
 * "rtsoftwaredeveloper07".
 *
 * Every entry is six characters or longer ON PURPOSE. These are matched as
 * substrings against a concatenated local part, and short tokens collide with
 * real names: "np" appears inside "saimanpokhrel" across the man/pokhrel
 * boundary, which refused a perfectly derivable name on the first run.
 */
const NOT_A_NAME = [
  "software", "developer", "contact", "official", "support", "robotics",
  "College", "hackathon",
].map((t) => t.toLowerCase());

function titleCase(word) {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Best-effort split of an email local part into a display name.
 * Returns { name, confidence, why }.
 */
function deriveName(localRaw) {
  const local = localRaw.toLowerCase();

  // Separators present: the owner already told us where the boundary is.
  if (/[._-]/.test(local)) {
    const parts = local
      .split(/[._-]+/)
      .map((p) => p.replace(/\d+/g, ""))
      .filter((p) => p.length > 1);
    if (parts.length >= 2 && !parts.some((p) => NOT_A_NAME.includes(p))) {
      return {
        name: parts.map(titleCase).join(" "),
        confidence: "high",
        why: "separator in local part",
      };
    }
  }

  const stripped = local.replace(/\d+/g, "");

  for (const token of NOT_A_NAME) {
    if (stripped.includes(token)) {
      return { name: null, confidence: "none", why: `contains "${token}" — a handle, not a name` };
    }
  }

  if (stripped.length < 4) {
    return { name: null, confidence: "none", why: "too short to split" };
  }

  // Surname at the end: "dipeshtimalsina" -> Dipesh Timalsina
  for (const surname of SURNAMES) {
    if (stripped.endsWith(surname) && stripped.length > surname.length + 2) {
      const given = stripped.slice(0, -surname.length);
      /*
       * No attempt is made to pull a middle initial off the given name.
       * "anilkpanta" really is Anil K. Panta, but the rule that finds it also
       * turns Dipesh into "Dipes H.", Sabin into "Sabi N." and Saiman into
       * "Saima N." — Nepali given names end in consonants far more often than
       * they carry a glued initial. Restricting it to the common initials
       * (K, B, P, R) does not help either: Deepak, Anup, Dilip and Sagar all
       * end that way. Splitting on the surname alone is right three times as
       * often, and the dry-run table below is where a human catches the rest.
       */
      return {
        name: `${titleCase(given)} ${titleCase(surname)}`,
        confidence: "high",
        why: `ends with surname "${surname}"`,
      };
    }
  }

  // Surname at the start: "subedinirajan" -> Nirajan Subedi (reordered).
  for (const surname of SURNAMES) {
    if (stripped.startsWith(surname) && stripped.length > surname.length + 2) {
      const given = stripped.slice(surname.length);
      return {
        name: `${titleCase(given)} ${titleCase(surname)}`,
        confidence: "medium",
        why: `starts with surname "${surname}" — name order assumed, please confirm`,
      };
    }
  }

  return { name: null, confidence: "none", why: "no surname boundary found" };
}

/** firstname + surname, lowercased, no dots — matches the four addresses the
    organisation already issued (e.g. suyogbhattarai@codefestchitwan.com). */
function orgEmail(fullName) {
  const slug = fullName
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .join("");
  return slug ? `${slug}@${ORG_DOMAIN}` : null;
}

// ---------------------------------------------------------------------------
// Authoritative overrides
// ---------------------------------------------------------------------------

/*
 * Names confirmed from a source other than the address itself, so they are not
 * guesses and do not need a human to re-confirm them.
 *
 * Nirajan Subedi — named as Project Lead, with a contact number, in the
 * "Notes for Judges" section of CodeFest2026_Hackathon_Timeline_Judges.docx.
 * Worth having here because the heuristic reads his address surname-first and
 * would otherwise ask.
 */
const KNOWN_NAMES = new Map([["subedinirajan15@gmail.com", "Nirajan Subedi"]]);

const overrides = new Map(KNOWN_NAMES);
if (namesFlag) {
  const path = namesFlag.slice("--names=".length);
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n").slice(1)) {
    const [email, name] = line.split(",").map((v) => (v ?? "").trim().replace(/^"|"$/g, ""));
    if (email && name) overrides.set(email.toLowerCase(), name);
  }
  console.log(`Loaded ${overrides.size} authoritative names from ${path}\n`);
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const { data: profiles, error } = await admin
  .from("profiles")
  .select("id, email, full_name, role, title")
  .order("role")
  .order("email");

if (error) {
  console.error("Could not read profiles:", error.message);
  process.exit(1);
}

/*
 * A placeholder name has no space, or has a digit in it.
 *
 * The obvious test — "does the name equal the email local part?" — is wrong,
 * and the first dry run proved it: most Nepali gmail addresses are exactly
 * firstnamesurname, so "Sijan Bagale" matches "sijanbagale" and a real name
 * supplied by the participant form gets treated as junk. Every genuine full
 * name in these sheets has a space; every fallback from nameFromEmail() does
 * not.
 */
function isPlaceholder(profile) {
  return !/\s/.test(profile.full_name.trim()) || /\d/.test(profile.full_name);
}

/*
 * Organisation addresses are for the organising team. Participants, judges
 * and mentors are guests of the event and keep the address they registered
 * with — issuing them a codefestchitwan.com login would hand an outsider an
 * organisation identity and, since the mailbox does not exist, no way back in.
 */
const ORG_EMAIL_ROLES = new Set(["executive", "volunteer"]);

const candidates = profiles.filter(isPlaceholder);

console.log(`\nIdentity normalisation  ${commit ? "(COMMITTING)" : "(DRY RUN)"}`);
console.log("=".repeat(78));
console.log(`${profiles.length} profiles, ${candidates.length} with a placeholder name\n`);

const plan = [];
for (const profile of candidates) {
  const override = overrides.get(profile.email.toLowerCase());
  const derived = override
    ? { name: override, confidence: "high", why: "supplied by --names" }
    : deriveName(profile.email.split("@")[0]);

  const org =
    derived.name && ORG_EMAIL_ROLES.has(profile.role) ? orgEmail(derived.name) : null;
  plan.push({ profile, ...derived, org });
}

const applying = plan.filter((p) => p.confidence === "high");
const review = plan.filter((p) => p.confidence !== "high");

const pad = (s, n) => String(s ?? "").padEnd(n).slice(0, n);

if (applying.length > 0) {
  console.log(`APPLYING — high confidence (${applying.length})`);
  console.log("-".repeat(78));
  console.log(pad("current email", 34) + pad("name", 22) + "org address");
  for (const p of applying) {
    console.log(pad(p.profile.email, 34) + pad(p.name, 22) + (p.org ?? ""));
  }
  console.log();
}

if (review.length > 0) {
  console.log(`NEEDS A HUMAN — left untouched (${review.length})`);
  console.log("-".repeat(78));
  for (const p of review) {
    console.log(`  ${pad(p.profile.email, 34)} ${p.profile.title ?? p.profile.role}`);
    console.log(`      ${p.why}${p.name ? ` — guess: "${p.name}"` : ""}`);
  }
  console.log(
    "\n  Supply these with:  --names=names.csv   (header: email,full_name)\n" +
      "  That file overrides the heuristic entirely and is marked high confidence.\n",
  );
}

if (!commit) {
  console.log("Dry run. Nothing written.");
  console.log(
    `Re-run with --commit to set names${changeEmails ? " and org addresses" : ""}.\n`,
  );
  process.exit(0);
}

// --- write -----------------------------------------------------------------

const changed = [];

for (const p of applying) {
  const patch = { full_name: p.name };
  const previousEmail = p.profile.email;

  if (changeEmails && p.org && p.org !== previousEmail) {
    const { error: authError } = await admin.auth.admin.updateUserById(p.profile.id, {
      email: p.org,
      email_confirm: true,
    });
    if (authError) {
      console.log(`  ! ${previousEmail}: could not change login — ${authError.message}`);
      continue;
    }
    patch.email = p.org;
    // Kept so a locked-out organiser can be traced back to the sheet.
    patch.notes = `Previously ${previousEmail}`;
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update(patch)
    .eq("id", p.profile.id);

  if (profileError) {
    console.log(`  ! ${previousEmail}: ${profileError.message}`);
    continue;
  }

  changed.push({ previousEmail, email: patch.email ?? previousEmail, name: p.name });
}

console.log(`Updated ${changed.length} profile${changed.length === 1 ? "" : "s"}.`);

if (changeEmails && changed.some((c) => c.email !== c.previousEmail)) {
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [["full_name", "previous_email", "new_login_email"].map(cell).join(",")];
  for (const c of changed) lines.push([c.name, c.previousEmail, c.email].map(cell).join(","));
  writeFileSync("codefest-2026-email-changes.csv", `﻿${lines.join("\r\n")}\r\n`);
  chmodSync("codefest-2026-email-changes.csv", 0o600);
  console.log(
    "\nWrote codefest-2026-email-changes.csv.\n" +
      "These people were handed a printed sheet with the OLD address on it.\n" +
      "They cannot log in until they are told the new one.\n",
  );
}
