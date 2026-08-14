/**
 * The organisers' lookup copy: every member, their password and their QR, in
 * one A4 landscape table for the registration desk.
 *
 * This is the document the per-member slips exist to avoid handing out. It
 * carries 100+ live passwords and 100+ scannable entry codes on shared pages,
 * so anyone holding it can log in as, and check in as, anybody at the event.
 * It is for the desk binder only — every page says so, and the cover says why.
 *
 * What it is actually for: a participant arrives having lost the slip, or with
 * a flat phone. The desk finds their row, reads their password back, or scans
 * the row's QR directly off the paper to check them in.
 *
 * Sorted by name, because "what is my password" is the question the desk
 * answers all day and the participant's name is the only key they have. A team
 * index follows at the back for team-by-team check-in, listing names only.
 *
 * Usage: node scripts/make-roster-pdf.mjs [--in FILE] [--out FILE] [--no-qr]
 *                                         [--role executive,volunteer]
 *
 * --role narrows it to those roles, for handing the volunteer coordinator
 * their own people's logins without also handing over 77 students' passwords.
 * The warning banner, the confidentiality footer and everything else about the
 * page are unchanged: a shorter list of live passwords is still a list of live
 * passwords.
 *
 * As with the slips, nothing is echoed to the terminal but counts and paths.
 */

import fs from "node:fs";
import path from "node:path";
import QRCode from "qrcode";
import { Canvas, buildPdf, ellipsize, textWidth } from "./lib/pdf.mjs";
import { loadMembers } from "./lib/roster-csv.mjs";

function flag(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const IN_PATH = flag("in", "codefest-2026-credentials.csv");
const WITH_QR = !process.argv.includes("--no-qr");

/**
 * `--role executive,volunteer` narrows the roster to those roles.
 *
 * The desk needs the whole file; a role brief needs a page it can hand to the
 * volunteer coordinator without also handing over 77 students' passwords. Same
 * document, same source of truth, fewer rows — rather than a second script
 * that could drift from this one about what a password is.
 */
const ROLE_FLAG = flag("role", null);
const WANTED = ROLE_FLAG
  ? new Set(
      ROLE_FLAG.split(",")
        .map((r) => r.trim().toLowerCase())
        .filter(Boolean),
    )
  : null;

const titleCase = (s) => s[0].toUpperCase() + s.slice(1);
const ROLE_SLUG = WANTED ? [...WANTED].sort().join("-") : null;
const ROLE_TITLE = WANTED
  ? `${[...WANTED].sort().map(titleCase).join(" & ")} roster`
  : "Registration desk roster";

const OUT_PATH = flag(
  "out",
  WANTED
    ? `credential-slips/${ROLE_SLUG}-roster.pdf`
    : "credential-slips/registration-desk-roster.pdf",
);

const PAGE_W = 842; // A4 landscape: the row needs the width more than the page
const PAGE_H = 595; //   needs the length
const MARGIN = 32;

const INK = "#2a1a10";
const ACCENT = "#b45309";
const WARN = "#9a3412";
const MUTED = "#8a7a6c";
const RULE = "#e5ddd4";
const STRIPE = "#faf7f4";
const BANNER = "#fdf3e7";

/**
 * Row height is set by the QR, and the QR is set by what a phone can read off
 * paper. 52pt over 37 modules is ~0.5mm per module at print size, which is
 * about the floor for reliable scanning; smaller saves pages and costs the
 * desk the one thing the column is there for.
 */
const QR_SIZE = WITH_QR ? 52 : 0;
const ROW_H = WITH_QR ? 60 : 26;

const COLUMNS = [
  { key: "name", label: "NAME", width: 158 },
  { key: "team", label: "TEAM", width: 122 },
  { key: "role", label: "ROLE", width: 74 },
  { key: "email", label: "LOGIN EMAIL", width: 198 },
  { key: "password", label: "PASSWORD", width: 116 },
];
if (WITH_QR) COLUMNS.push({ key: "qr", label: "SCAN", width: 60 });

const TABLE_W = COLUMNS.reduce((sum, col) => sum + col.width, 0);
const GAP = 10;
const TOTAL_W = TABLE_W + GAP * (COLUMNS.length - 1);

function columnX() {
  const xs = {};
  let x = MARGIN + (PAGE_W - MARGIN * 2 - TOTAL_W) / 2;
  for (const col of COLUMNS) {
    xs[col.key] = x;
    x += col.width + GAP;
  }
  return xs;
}
const X = columnX();

const HEADER_TOP = PAGE_H - MARGIN;
const TABLE_TOP = HEADER_TOP - 58; // below the banner and the column labels
const FOOTER_Y = MARGIN + 10;
const ROWS_PER_PAGE = Math.floor((TABLE_TOP - (FOOTER_Y + 14)) / ROW_H);

/**
 * The banner that makes the page unmistakable if it is left on a desk, plus
 * the running header and footer.
 *
 * `columns` is off for the team index, whose pages are not that table and
 * would otherwise carry a row of labels naming columns they do not have.
 */
function pageChrome(c, { pageNo, pageCount, first, last, columns = true, title }) {
  c.fill("#ffffff").rect(0, 0, PAGE_W, PAGE_H);

  c.fill(BANNER).rect(MARGIN, HEADER_TOP - 24, PAGE_W - MARGIN * 2, 22);
  c.fill(WARN).text(
    "ORGANISERS ONLY — LIVE PASSWORDS AND ENTRY CODES. DO NOT PHOTOGRAPH, SHARE OR LEAVE UNATTENDED.",
    "F2", 7.5, MARGIN + 10, HEADER_TOP - 17, 0.6,
  );

  c.fill(ACCENT).text("CODEFEST CHITWAN 2026", "F2", 8, MARGIN, HEADER_TOP - 40, 1.1);
  c.fill(MUTED).text(
    title ?? "Registration desk roster", "F1", 8, MARGIN + 148, HEADER_TOP - 40,
  );

  if (first && last) {
    c.fill(INK).textRight(
      `${first}  —  ${last}`, "F2", 8.5, PAGE_W - MARGIN, HEADER_TOP - 40,
    );
  }

  // Column labels, with the rule that separates them from the rows.
  if (columns) {
    for (const col of COLUMNS) {
      c.fill(MUTED).text(col.label, "F2", 6.5, X[col.key], TABLE_TOP + 8, 0.7);
    }
  }
  c.fill(RULE).rule(MARGIN, TABLE_TOP, PAGE_W - MARGIN * 2);

  c.fill(RULE).rule(MARGIN, FOOTER_Y + 12, PAGE_W - MARGIN * 2);
  c.fill(MUTED).text(
    "Codefest Chitwan 2026 — confidential", "F1", 7, MARGIN, FOOTER_Y,
  );
  c.fill(MUTED).textRight(
    `Page ${pageNo} of ${pageCount}`, "F1", 7, PAGE_W - MARGIN, FOOTER_Y,
  );
}

function drawRow(c, member, top, striped) {
  const bottom = top - ROW_H;
  if (striped) {
    c.fill(STRIPE).rect(MARGIN, bottom, PAGE_W - MARGIN * 2, ROW_H);
  }

  // Text sits on a common baseline near the top of the row, so the columns
  // still line up when the QR makes the row much taller than the type.
  const base = top - (WITH_QR ? 18 : 17);
  const w = (key) => COLUMNS.find((col) => col.key === key).width;

  c.fill(INK).text(
    ellipsize(member.full_name, "F2", 9.5, w("name")), "F2", 9.5, X.name, base,
  );

  c.fill(member.team ? INK : MUTED).text(
    member.team ? ellipsize(member.team, "F1", 8.5, w("team")) : "—",
    "F1", 8.5, X.team, base,
  );

  c.fill(MUTED).text(
    ellipsize(member.roleLabel || "—", "F1", 8.5, w("role")), "F1", 8.5, X.role, base,
  );

  c.fill(INK).text(
    ellipsize(member.email, "F1", 8.5, w("email")), "F1", 8.5, X.email, base,
  );

  if (member.password) {
    // Monospaced, because the desk reads these aloud and Courier is the only
    // base-14 face that keeps l/1 and O/0 apart.
    const size = textWidth(member.password, "F3", 9) > w("password") ? 7.5 : 9;
    c.fill(INK).text(member.password, "F3", size, X.password, base);
  } else {
    c.fill(MUTED).text("unchanged", "F1", 8, X.password, base);
  }

  // The member's title is useful for staff lookup but not worth a column of
  // its own, so it goes under the name where there is room for it.
  if (WITH_QR && member.title) {
    c.fill(MUTED).text(
      ellipsize(member.title, "F1", 7.5, w("name")), "F1", 7.5, X.name, base - 11,
    );
  }

  if (WITH_QR) {
    c.qr(
      QRCode.create(member.verifyUrl, { errorCorrectionLevel: "M" }).modules,
      X.qr, bottom + (ROW_H - QR_SIZE) / 2, QR_SIZE, INK,
    );
  }

  c.fill(RULE).rule(MARGIN, bottom, PAGE_W - MARGIN * 2, 0.4);
}

/** Names only — the back index is for finding a team, not its credentials. */
function teamIndexPages(members, startPage, pageCount) {
  const teams = new Map();
  for (const m of members) {
    const key = m.team || "No team";
    if (!teams.has(key)) teams.set(key, []);
    teams.get(key).push(m.full_name);
  }

  const ordered = [...teams.entries()].sort((a, b) => {
    if (a[0] === "No team") return 1;
    if (b[0] === "No team") return -1;
    return a[0].localeCompare(b[0]);
  });

  const COL_W = 250;
  const COLS = 3;
  const TOP = TABLE_TOP - 4;
  const LINE = 12;

  const pages = [];
  let c = null;
  let col = 0;
  let y = TOP;

  const newPage = () => {
    c = new Canvas(PAGE_W, PAGE_H);
    pageChrome(c, {
      pageNo: startPage + pages.length,
      pageCount,
      columns: false,
      title: "Team index — names only, no credentials",
    });
    c.fill(MUTED).text("TEAM INDEX", "F2", 6.5, MARGIN, TABLE_TOP + 8, 0.7);
    pages.push(c);
    col = 0;
    y = TOP;
  };
  newPage();

  for (const [team, names] of ordered) {
    const needed = (names.length + 2) * LINE;
    if (y - needed < FOOTER_Y + 20) {
      col++;
      y = TOP;
      if (col >= COLS) newPage();
    }
    const x = MARGIN + col * (COL_W + 20);

    c.fill(ACCENT).text(
      ellipsize(`${team}  (${names.length})`, "F2", 9, COL_W), "F2", 9, x, y,
    );
    y -= LINE + 2;

    for (const name of names) {
      c.fill(INK).text(ellipsize(name, "F1", 8.5, COL_W), "F1", 8.5, x + 8, y);
      y -= LINE;
    }
    y -= 8;
  }

  return pages;
}

/* ------------------------------------------------------------------- run */

const { members: allMembers, skipped } = loadMembers(IN_PATH);
if (!allMembers.length) {
  console.error(`! No usable members in ${IN_PATH}.`);
  process.exit(1);
}

const members = WANTED
  ? allMembers.filter((m) => WANTED.has((m.role ?? "").toLowerCase()))
  : allMembers;

if (!members.length) {
  const available = [...new Set(allMembers.map((m) => m.role).filter(Boolean))];
  console.error(
    `! No members with role ${[...WANTED].join(", ")} in ${IN_PATH}.\n` +
      `  Roles present: ${available.sort().join(", ")}`,
  );
  process.exit(1);
}

/*
 * The team index is a participant device — it exists so the desk can check a
 * team in together. Staff have no team, so for a filtered roster it would be
 * one "No team" heading above a copy of the list that is already on page one.
 */
const withIndex = members.some((m) => m.team);

const tablePages = Math.ceil(members.length / ROWS_PER_PAGE);

// The index needs the total page count for its footer, and its own length
// depends on the teams, so it is laid out once to be measured and once for
// real. Cheap at this size, and it keeps "Page n of m" honest.
const probe = withIndex
  ? teamIndexPages(members, tablePages + 1, tablePages + 1)
  : [];
const pageCount = tablePages + probe.length;

const pages = [];
for (let p = 0; p < tablePages; p++) {
  const slice = members.slice(p * ROWS_PER_PAGE, (p + 1) * ROWS_PER_PAGE);
  const c = new Canvas(PAGE_W, PAGE_H);
  pageChrome(c, {
    pageNo: p + 1,
    pageCount,
    first: slice[0].full_name,
    last: slice[slice.length - 1].full_name,
    title: ROLE_TITLE,
  });

  slice.forEach((member, i) => {
    drawRow(c, member, TABLE_TOP - i * ROW_H, i % 2 === 1);
  });

  pages.push(c);
}

if (withIndex) pages.push(...teamIndexPages(members, tablePages + 1, pageCount));

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, buildPdf(pages));

console.log(
  `Wrote ${OUT_PATH} — ${members.length} members across ${pages.length} pages ` +
    `(${tablePages} roster + ${pages.length - tablePages} team index)` +
    `${WANTED ? `, limited to ${[...WANTED].sort().join(", ")}` : ""}` +
    `${WITH_QR ? "" : ", without QR codes"}.`,
);
console.log("Organisers only. Keep it at the desk; shred or delete it after the event.");
if (skipped.length) {
  console.log(`\nSkipped ${skipped.length}:`);
  for (const s of skipped) console.log(`  ${s.full_name || "(no name)"} — ${s.why}`);
}
