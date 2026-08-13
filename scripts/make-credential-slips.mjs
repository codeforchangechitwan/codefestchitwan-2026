/**
 * Turns the plaintext credential CSV into one printable slip per member.
 *
 * Each member gets a self-contained A6 page: their name, the email they log in
 * with, their password, and their identity QR. One page per person rather than
 * one shared roster, because these are live credentials — a password lets
 * someone log in as that member, and the QR is what the desk scans for entry
 * and meals. A single document listing all of them would hand every
 * participant the ability to impersonate any other, which is the same reason
 * src/app/api/admin/badges/route.ts refuses to leave the organising team.
 *
 * For the organisers' own lookup copy, see make-roster-pdf.mjs.
 *
 * Writes two things:
 *   credential-slips/all-slips.pdf     every page in one file, for printing
 *   credential-slips/individual/*.pdf  one file per member, for sending
 *
 * The per-member files are what you distribute. Send each person only theirs.
 *
 * Usage: node scripts/make-credential-slips.mjs [--in FILE] [--out DIR]
 *
 * Nothing here prints a password to the terminal; the script reports counts and
 * file paths only, so a shared screen or a scrollback buffer never carries the
 * credentials it just wrote to disk.
 */

import fs from "node:fs";
import path from "node:path";
import QRCode from "qrcode";
import { Canvas, buildPdf, fitSize } from "./lib/pdf.mjs";
import { loadMembers, safeName } from "./lib/roster-csv.mjs";

function flag(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const IN_PATH = flag("in", "codefest-2026-credentials.csv");
const OUT_DIR = flag("out", "credential-slips");

const PAGE_W = 298; // A6, the size of a postcard
const PAGE_H = 420;
const MARGIN = 26;

const INK = "#2a1a10"; // the same brown the QR itself is drawn in
const ACCENT = "#b45309";
const MUTED = "#8a7a6c";
const PANEL = "#f7f2ec";
const RULE = "#e5ddd4";

function slip(member) {
  const c = new Canvas(PAGE_W, PAGE_H);
  const inner = PAGE_W - MARGIN * 2;

  c.fill("#ffffff").rect(0, 0, PAGE_W, PAGE_H);

  c.fill(ACCENT).text("CODEFEST CHITWAN 2026", "F2", 7.5, MARGIN, PAGE_H - 34, 1.1);
  c.fill(RULE).rule(MARGIN, PAGE_H - 44, inner);

  c.fill(INK).text(
    member.full_name,
    "F2",
    fitSize(member.full_name, "F2", inner, 17, 9),
    MARGIN,
    PAGE_H - 72,
  );

  const meta = [member.roleLabel, member.title, member.team]
    .filter(Boolean)
    .join("  ·  ");
  if (meta) {
    c.fill(MUTED).text(
      meta,
      "F1",
      fitSize(meta, "F1", inner, 8.5, 6),
      MARGIN,
      PAGE_H - 87,
    );
  }

  // Credentials sit in a tinted panel so they read as the one thing to copy.
  const panelH = 74;
  const panelY = PAGE_H - 100 - panelH;
  c.fill(PANEL).rect(MARGIN, panelY, inner, panelH);

  const px = MARGIN + 12;
  const pw = inner - 24;

  c.fill(MUTED).text("LOG IN WITH", "F2", 6.5, px, panelY + panelH - 16, 0.7);
  c.fill(INK).text(
    member.email,
    "F1",
    fitSize(member.email, "F1", pw, 9.5, 6.5),
    px,
    panelY + panelH - 30,
  );

  c.fill(MUTED).text("PASSWORD", "F2", 6.5, px, panelY + panelH - 48, 0.7);
  if (member.password) {
    c.fill(INK).text(
      member.password,
      "F3",
      fitSize(member.password, "F3", pw, 12, 7),
      px,
      panelY + panelH - 63,
    );
  } else {
    c.fill(MUTED).text(
      "Your existing password is unchanged",
      "F1",
      8.5,
      px,
      panelY + panelH - 63,
    );
  }

  // The QR encodes the same /verify/<token> URL the in-app card shows, so a
  // printed slip and a phone screen scan identically at the desk.
  const qrSize = 132;
  const qrY = panelY - 16 - qrSize;
  c.qr(QRCode.create(member.verifyUrl, { errorCorrectionLevel: "M" }).modules,
    (PAGE_W - qrSize) / 2, qrY, qrSize, INK);

  c.fill(MUTED).textCentre(
    "Scan this at entry, meals and sessions",
    "F1", 7.5, PAGE_W / 2, qrY - 14,
  );

  c.fill(RULE).rule(MARGIN, 48, inner);
  c.fill(MUTED).textCentre(
    "This page is yours alone. Do not forward or post it.",
    "F1", 7, PAGE_W / 2, 34,
  );

  return c;
}

const { members, skipped } = loadMembers(IN_PATH);

const individualDir = path.join(OUT_DIR, "individual");
fs.mkdirSync(individualDir, { recursive: true });

const pages = [];
let noPassword = 0;

for (const member of members) {
  const page = slip(member);
  pages.push(page);
  if (!member.password) noPassword++;

  fs.writeFileSync(
    path.join(
      individualDir,
      `${safeName(member.full_name)}-${member.token.slice(0, 8)}.pdf`,
    ),
    buildPdf([page]),
  );
}

const combined = path.join(OUT_DIR, "all-slips.pdf");
fs.writeFileSync(combined, buildPdf(pages));

console.log(`Wrote ${members.length} slips.`);
console.log(`  ${combined} — all pages, for printing`);
console.log(`  ${individualDir}/ — one PDF per member, for sending`);
if (noPassword) {
  console.log(`  ${noPassword} slip(s) carry no password (blank in the CSV).`);
}
if (skipped.length) {
  console.log(`\nSkipped ${skipped.length}:`);
  for (const s of skipped) console.log(`  ${s.full_name || "(no name)"} — ${s.why}`);
}
