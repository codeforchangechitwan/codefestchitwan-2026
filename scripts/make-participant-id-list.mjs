/**
 * The participant ID list: every participant's code and name, grouped by team.
 *
 * This is the one roster document that carries no secrets. The desk roster
 * (make-roster-pdf.mjs) exists to answer "what is my password" and therefore
 * cannot leave the binder; this one answers "who is CFC-07-3" and "which team
 * is this person on", so it can go on a wall, into a volunteer's hand, or to
 * the judging table without any of that mattering. Nothing here is a
 * credential: no password, no email, no QR, no phone number.
 *
 * It reads the codes from the database rather than recomputing them from the
 * spreadsheet, so that it can only ever print what the site itself shows a
 * participant on their identity card. If the two disagree the fix is to re-run
 * assign-participant-codes.mjs, not to change this file.
 *
 * Two columns, because 20 teams in one column is three pages of mostly white
 * paper and this is meant to be scanned standing up.
 *
 * Usage: node scripts/make-participant-id-list.mjs [--out FILE]
 */

import fs from "node:fs";
import path from "node:path";
import { Canvas, buildPdf, ellipsize, textWidth } from "./lib/pdf.mjs";
import { serviceClient } from "./lib/supabase.mjs";

function flag(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const OUT_PATH = flag("out", "codefest-2026-participant-ids.pdf");

// A4 portrait, in points.
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 46;
const GUTTER = 26;
const COL_W = (PAGE_W - MARGIN * 2 - GUTTER) / 2;
const BOTTOM = 54;

const INK = "#1c1712";
const MUTED = "#6b6259";
const BRAND = "#8b4513";
const ACCENT = "#f2705b";
const RULE = "#d9d2c9";
const WASH = "#f6f2ed";

const EVENT_LINE = "Codefest 2026 · Chitwan · 14 August 2026";

const LINE = 12.4; // one member row
const TEAM_HEAD = 28; // team name, college, rule
const TEAM_TAIL = 9; // gap before the next team

/**
 * A team is measured before anything is drawn, so the layout can balance the
 * columns rather than filling the first one to the brim and leaving the last
 * page a third full. Blocks are never split: a team's members always sit under
 * their own heading.
 */
function teamBlock(team) {
  return {
    height: TEAM_HEAD + LINE * team.members.length + TEAM_TAIL,
    draw(page, x, top) {
      let y = top;

      page.fill(BRAND).text(team.code, "F2", 10, x, y);
      const codeW = textWidth(team.code, "F2", 10) + 7;
      page
        .fill(INK)
        .text(ellipsize(team.name, "F2", 10, COL_W - codeW), "F2", 10, x + codeW, y);
      y -= 11;

      if (team.institution) {
        page
          .fill(MUTED)
          .text(ellipsize(team.institution, "F1", 7.6, COL_W), "F1", 7.6, x, y);
      }
      y -= 7;

      page.fill(RULE).rule(x, y, COL_W, 0.6);
      y -= 10;

      for (const member of team.members) {
        // Courier so the codes form a straight edge down the column.
        page.fill(BRAND).text(member.participant_code, "F3", 7.8, x, y);

        const nameW = COL_W - 46 - (member.isLeader ? 24 : 0);
        page
          .fill(INK)
          .text(ellipsize(member.full_name, "F1", 8.6, nameW), "F1", 8.6, x + 46, y);

        if (member.isLeader) {
          page.fill(ACCENT).text("LEAD", "F2", 6.4, x + COL_W - 22, y + 0.4);
        }

        y -= LINE;
      }
    },
  };
}

/**
 * Lays blocks into two columns per page, then across pages.
 *
 * Two passes. The first fills each column to its physical limit, which settles
 * how many columns the document actually needs. The second fills again with a
 * soft target of an equal share per column, so the content spreads evenly
 * instead of pooling at the front — but only if that still fits in the same
 * number of columns, since a prettier layout is not worth an extra page.
 */
function planColumns(blocks, firstTop) {
  const capacityOf = (index) =>
    (Math.floor(index / 2) === 0 ? firstTop : PAGE_H - MARGIN) - BOTTOM;

  const fill = (softTarget) => {
    const columns = [[]];
    let index = 0;
    let used = 0;

    for (const block of blocks) {
      const overflows = used > 0 && used + block.height > capacityOf(index);
      const pastShare = used > 0 && softTarget && used + block.height > softTarget;

      if (overflows || pastShare) {
        index += 1;
        columns.push([]);
        used = 0;
      }

      columns[index].push(block);
      used += block.height;
    }

    return columns;
  };

  const packed = fill(null);
  const total = blocks.reduce((sum, block) => sum + block.height, 0);
  const balanced = fill(total / packed.length);

  return balanced.length <= packed.length ? balanced : packed;
}

function render(columns, firstTop) {
  const pages = [];

  columns.forEach((blocks, index) => {
    const pageIndex = Math.floor(index / 2);

    if (!pages[pageIndex]) {
      const page = new Canvas(PAGE_W, PAGE_H);
      page.fill("#ffffff").rect(0, 0, PAGE_W, PAGE_H);
      pages[pageIndex] = page;
      if (pageIndex === 0) masthead(page);
    }

    const x = MARGIN + (index % 2) * (COL_W + GUTTER);
    let y = pageIndex === 0 ? firstTop : PAGE_H - MARGIN;

    for (const block of blocks) {
      block.draw(pages[pageIndex], x, y);
      y -= block.height;
    }
  });

  return pages;
}

/** Page one only. Its depth is FIRST_TOP, which the layout reserves. */
function masthead(page) {
  page.fill(BRAND).rect(MARGIN, PAGE_H - MARGIN - 3, 40, 3);
  page.fill(INK).text("Participant IDs", "F2", 20, MARGIN, PAGE_H - MARGIN - 28);
  page.fill(MUTED).text(EVENT_LINE, "F1", 8.6, MARGIN, PAGE_H - MARGIN - 42);
}

function footers(pages) {
  pages.forEach((page, index) => {
    page.fill(RULE).rule(MARGIN, BOTTOM - 12, PAGE_W - MARGIN * 2, 0.6);
    page
      .fill(MUTED)
      .text(
        "Codefest 2026 · Chitwan — participant ID list. No passwords on this sheet.",
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

/** People whose address is a reserved placeholder still owe the desk a real one. */
function confirmBlock(pending) {
  const panelHeight = 36 + pending.length * 11;

  return {
    height: panelHeight + 14,
    draw(page, x, top) {
      page.fill(WASH).rect(x, top - panelHeight + 10, COL_W, panelHeight);
      page.fill(ACCENT).rect(x, top - panelHeight + 10, 2.5, panelHeight);

      let y = top - 4;
      page.fill(BRAND).text("CONFIRM AT THE DESK", "F2", 7.6, x + 9, y);
      y -= 11;
      page
        .fill(MUTED)
        .text("These addresses are placeholders.", "F1", 7.2, x + 9, y);
      y -= 12;

      for (const person of pending) {
        page.fill(BRAND).text(person.participant_code, "F3", 7, x + 9, y);
        page
          .fill(INK)
          .text(
            ellipsize(person.full_name, "F1", 7.8, COL_W - 66),
            "F1",
            7.8,
            x + 55,
            y,
          );
        y -= 11;
      }
    },
  };
}

async function main() {
  const supabase = serviceClient();

  const { data: teams, error: teamError } = await supabase
    .from("teams")
    .select("id, code, name, institution")
    .order("code");
  if (teamError) throw new Error(teamError.message);

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, participant_code, team_id, role")
    .not("participant_code", "is", null);
  if (profileError) throw new Error(profileError.message);

  /** "CFC-07-3" -> 3, so seats sort numerically rather than as text. */
  const seat = (code) => Number(code.split("-").at(-1) ?? 0);

  const grouped = teams
    .map((team) => ({
      ...team,
      members: profiles
        .filter((p) => p.team_id === team.id)
        .sort((a, b) => seat(a.participant_code) - seat(b.participant_code))
        .map((p) => ({ ...p, isLeader: seat(p.participant_code) === 1 })),
    }))
    .filter((team) => team.members.length > 0);

  const orphans = profiles.filter((p) => !teams.some((t) => t.id === p.team_id));
  const pending = profiles
    .filter((p) => /@codefestchitwan\.invalid$/i.test(p.email ?? ""))
    .sort((a, b) => a.participant_code.localeCompare(b.participant_code));

  if (grouped.length === 0) {
    throw new Error(
      "No participant codes in the database — run assign-participant-codes.mjs first.",
    );
  }

  // The masthead only eats into the first page, so it sets that page's top.
  const firstTop = PAGE_H - MARGIN - 60;

  const blocks = grouped.map(teamBlock);
  if (pending.length) blocks.push(confirmBlock(pending));

  const pages = render(planColumns(blocks, firstTop), firstTop);
  footers(pages);

  const dir = path.dirname(OUT_PATH);
  if (dir && dir !== ".") fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OUT_PATH, buildPdf(pages));

  const headcount = grouped.reduce((n, t) => n + t.members.length, 0);
  console.log(`teams        ${grouped.length}`);
  console.log(`participants ${headcount}`);
  console.log(`pages        ${pages.length}`);
  if (pending.length) console.log(`to confirm   ${pending.length}`);
  if (orphans.length) {
    console.log(`\n${orphans.length} coded ${orphans.length === 1 ? "person has" : "people have"} no team and were left out:`);
    for (const o of orphans) console.log(`  ${o.participant_code}  ${o.full_name}`);
  }
  console.log(`\nWrote ${OUT_PATH}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
