/**
 * Who's who on the organising side: every executive with their portfolio, and
 * every volunteer by name.
 *
 * The counterpart to make-participant-id-list.mjs, which answers "who is
 * CFC-07-3". This one answers "who do I ask about the money" and "is this
 * person supposed to be behind the desk". Like that list it carries no
 * credentials — no password, no email, no QR, no phone — so it can go on a
 * wall, into a volunteer's hand, or to a partner without any of that
 * mattering. The desk binder copy with passwords is make-roster-pdf.mjs.
 *
 * Executives are ordered by office rather than alphabetically: on a sheet
 * people read standing up, "who is in charge" is the first question, and an
 * alphabetical list buries the Project Lead between two coordinators. Titles
 * this script does not recognise sort to the end alphabetically rather than
 * being guessed at.
 *
 * Names are printed exactly as the database holds them. Several accounts were
 * imported from spreadsheets with no name column and still carry the email
 * local part as a name ("Rtsoftwaredeveloper07"); those are listed in a panel
 * at the end and reported on the terminal, because the fix is to run
 * normalise-identities.mjs, not to invent a name here.
 *
 * Usage: node scripts/make-staff-list-pdf.mjs [--out FILE]
 *
 * Needs Node 22+ (supabase-js needs native WebSocket).
 */

import fs from "node:fs";
import path from "node:path";
import { Canvas, buildPdf, ellipsize, textWidth } from "./lib/pdf.mjs";
import { serviceClient } from "./lib/supabase.mjs";

function flag(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const OUT_PATH = flag("out", "codefest-2026-staff-list.pdf");

// A4 portrait, in points.
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 46;
const GUTTER = 26;
const COL_W = (PAGE_W - MARGIN * 2 - GUTTER) / 2;
const FULL_W = PAGE_W - MARGIN * 2;
const BOTTOM = 54;

const INK = "#1c1712";
const MUTED = "#6b6259";
const BRAND = "#8b4513";
const ACCENT = "#f2705b";
const RULE = "#d9d2c9";
const WASH = "#f6f2ed";

const EVENT_LINE = "Codefest 2026 · Chitwan · 14–16 August 2026 · Forbes College";

/**
 * Office order. Office-bearers first, then functional leads alphabetically.
 * Anything not listed sorts after these, alphabetically — a title this script
 * has never seen is not evidence that it outranks the Treasurer.
 */
const OFFICE_ORDER = [
  "Project Lead",
  "Vice Project Lead",
  "Secretary",
  "Vice Secretary",
  "Treasurer",
  "Admin Lead",
  "HR Lead",
  "Operation Lead",
  "Public Relation Lead",
  "Tech Lead",
];

function officeRank(title) {
  const i = OFFICE_ORDER.indexOf((title ?? "").trim());
  return i === -1 ? OFFICE_ORDER.length : i;
}

/**
 * A name the import derived from an email rather than a human typing it.
 *
 * One word AND carrying a digit is the signature — "Rtsoftwaredeveloper07",
 * "Bhattaram611". A real single-word name without digits ("Sushmita") is left
 * alone, because flagging it would be a guess about somebody's actual name.
 */
function looksDerived(person) {
  const name = (person.full_name ?? "").trim();
  if (!name) return true;
  if (/\s/.test(name)) return false;
  if (/\d/.test(name)) return true;
  return name.toLowerCase() === (person.email ?? "").split("@")[0]?.toLowerCase();
}

/** Sequential layout with page breaks — 27 people today, room to grow. */
class Flow {
  constructor() {
    this.pages = [];
    this.newPage(true);
  }

  newPage(first = false) {
    const page = new Canvas(PAGE_W, PAGE_H);
    page.fill("#ffffff").rect(0, 0, PAGE_W, PAGE_H);
    this.pages.push(page);
    this.page = page;
    this.y = PAGE_H - MARGIN;
    if (first) {
      page.fill(BRAND).rect(MARGIN, PAGE_H - MARGIN - 3, 40, 3);
      page
        .fill(INK)
        .text("Organising Team & Volunteers", "F2", 20, MARGIN, PAGE_H - MARGIN - 28);
      page.fill(MUTED).text(EVENT_LINE, "F1", 8.6, MARGIN, PAGE_H - MARGIN - 42);
      this.y = PAGE_H - MARGIN - 68;
    }
  }

  /** Reserve `height` points, breaking to a new page if they do not fit. */
  need(height) {
    if (this.y - height < BOTTOM) this.newPage();
    return this.y;
  }

  heading(text, count) {
    this.need(34);
    this.page.fill(BRAND).text(text.toUpperCase(), "F2", 10.5, MARGIN, this.y);
    const w = textWidth(text.toUpperCase(), "F2", 10.5);
    this.page
      .fill(MUTED)
      .text(`(${count})`, "F1", 9, MARGIN + w + 7, this.y);
    this.y -= 9;
    this.page.fill(RULE).rule(MARGIN, this.y, FULL_W, 0.8);
    this.y -= 15;
  }
}

/** Name on the left, portfolio right-aligned, so titles form a clean edge. */
function drawExecutives(flow, people) {
  for (const person of people) {
    const y = flow.need(15);
    const title = (person.title ?? "").trim();
    const titleW = title ? textWidth(title, "F2", 8.6) : 0;

    flow.page
      .fill(INK)
      .text(
        ellipsize(person.full_name, "F1", 9.6, FULL_W - titleW - 24),
        "F1",
        9.6,
        MARGIN,
        y,
      );

    if (title) {
      flow.page.fill(BRAND);
      flow.page.textRight(title, "F2", 8.6, PAGE_W - MARGIN, y);
    }

    flow.y -= 15;
  }
}

/** Two columns: 17 names down one side of A4 is mostly white paper. */
function drawVolunteers(flow, people) {
  const rows = Math.ceil(people.length / 2);

  for (let row = 0; row < rows; row += 1) {
    const y = flow.need(14);

    for (const col of [0, 1]) {
      const person = people[row + col * rows];
      if (!person) continue;
      const x = MARGIN + col * (COL_W + GUTTER);

      // Drawn, not typed: "•" is absent from the WinAnsi width table in
      // lib/pdf.mjs and comes out as "?". A rect has no font to be missing from.
      flow.page.fill(ACCENT).rect(x + 1, y + 2.4, 2.8, 2.8);
      flow.page
        .fill(INK)
        .text(
          ellipsize(person.full_name, "F1", 9.2, COL_W - 14),
          "F1",
          9.2,
          x + 10,
          y,
        );
    }

    flow.y -= 14;
  }
}

/** Accounts still carrying an email-derived name. */
function drawPending(flow, pending) {
  const panelH = 34 + pending.length * 11;
  const top = flow.need(panelH + 20);

  flow.page.fill(WASH).rect(MARGIN, top - panelH + 8, FULL_W, panelH);
  flow.page.fill(ACCENT).rect(MARGIN, top - panelH + 8, 2.5, panelH);

  let y = top - 5;
  flow.page.fill(BRAND).text("NAMES TO CONFIRM", "F2", 7.6, MARGIN + 10, y);
  y -= 11;
  flow.page
    .fill(MUTED)
    .text(
      "Imported without a name column — these are email addresses, not how anyone is introduced.",
      "F1",
      7.2,
      MARGIN + 10,
      y,
    );
  y -= 12;

  for (const person of pending) {
    flow.page.fill(INK).text(person.full_name, "F1", 7.8, MARGIN + 10, y);
    flow.page
      .fill(MUTED)
      .text(person.title?.trim() || "Volunteer", "F1", 7.4, MARGIN + 190, y);
    y -= 11;
  }

  flow.y = top - panelH - 12;
}

function footers(pages) {
  pages.forEach((page, index) => {
    page.fill(RULE).rule(MARGIN, BOTTOM - 12, FULL_W, 0.6);
    page
      .fill(MUTED)
      .text(
        "Codefest 2026 · Chitwan — organising team and volunteers. No passwords on this sheet.",
        "F1",
        7.2,
        MARGIN,
        BOTTOM - 24,
      );
    page.textRight(
      `Page ${index + 1} of ${pages.length}`,
      "F1",
      7.2,
      PAGE_W - MARGIN,
      BOTTOM - 24,
    );
  });
}

async function main() {
  const supabase = serviceClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, title, role, is_active")
    .in("role", ["executive", "volunteer"])
    .eq("is_active", true);
  if (error) throw new Error(error.message);

  const byName = (a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? "");

  const executives = (data ?? [])
    .filter((p) => p.role === "executive")
    .sort((a, b) => officeRank(a.title) - officeRank(b.title) || byName(a, b));

  const volunteers = (data ?? [])
    .filter((p) => p.role === "volunteer")
    .sort(byName);

  if (executives.length === 0 && volunteers.length === 0) {
    throw new Error("No active executives or volunteers found.");
  }

  const pending = [...executives, ...volunteers].filter(looksDerived);

  const flow = new Flow();

  if (executives.length) {
    flow.heading("Organising members", executives.length);
    drawExecutives(flow, executives);
    flow.y -= 14;
  }

  if (volunteers.length) {
    flow.heading("Volunteers", volunteers.length);
    drawVolunteers(flow, volunteers);
    flow.y -= 14;
  }

  if (pending.length) drawPending(flow, pending);

  footers(flow.pages);

  const dir = path.dirname(OUT_PATH);
  if (dir && dir !== ".") fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OUT_PATH, buildPdf(flow.pages));

  console.log(`organising members ${executives.length}`);
  console.log(`volunteers         ${volunteers.length}`);
  console.log(`pages              ${flow.pages.length}`);
  if (pending.length) {
    console.log(
      `\n${pending.length} ${pending.length === 1 ? "name is" : "names are"} still the email local part — run normalise-identities.mjs:`,
    );
    for (const p of pending) console.log(`  ${p.full_name}  <${p.email}>`);
  }
  console.log(`\nWrote ${OUT_PATH}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
