/**
 * Reads the plaintext credential CSV written by scripts/import-registrations.mjs.
 *
 * Shared by the per-member slips and the desk roster so the two documents can
 * never disagree about who is on the roster or what their password is.
 */

import fs from "node:fs";

/**
 * A CSV reader that understands quoted fields.
 *
 * Names and titles are free text typed by registrants, so a comma inside a
 * field is a matter of time; splitting on "," would silently shift every
 * column after it and print somebody else's password against their name.
 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") field += ch;
  }

  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export const VERIFY_BASE = "https://codefestchitwan-2026.vercel.app/verify";

/**
 * Parsed members, sorted by name, plus anyone the file could not describe.
 *
 * A row without a card_url or a name is reported rather than rendered: a slip
 * with no QR, or a roster line with no name, looks valid at the desk and then
 * fails in front of the person holding it.
 */
export function loadMembers(csvPath) {
  const raw = fs.readFileSync(csvPath, "utf8").replace(/^﻿/, "");
  const rows = parseCsv(raw);
  if (!rows.length) throw new Error(`${csvPath} is empty`);

  const header = rows[0].map((h) => h.trim());
  const col = (name) => header.indexOf(name);

  for (const name of ["full_name", "email", "password", "card_url"]) {
    if (col(name) === -1) {
      throw new Error(
        `${csvPath} has no "${name}" column. Columns: ${header.join(", ")}`,
      );
    }
  }

  const members = [];
  const skipped = [];

  for (const row of rows.slice(1)) {
    const cell = (name) => (row[col(name)] ?? "").trim();
    const cardUrl = cell("card_url");
    const token = /([0-9a-f-]{36})\s*$/i.exec(cardUrl)?.[1];
    const full_name = cell("full_name");
    const email = cell("email");
    const role = cell("role");

    if (!token || !full_name || !email) {
      skipped.push({
        full_name,
        email,
        why: !full_name || !email ? "missing name or email" : "no card_url",
      });
      continue;
    }

    members.push({
      full_name,
      email,
      token,
      password: cell("password"),
      title: cell("title"),
      team: cell("team"),
      role,
      roleLabel: role ? role[0].toUpperCase() + role.slice(1) : "",
      verifyUrl: `${VERIFY_BASE}/${token}`,
    });
  }

  members.sort((a, b) => a.full_name.localeCompare(b.full_name));
  return { members, skipped };
}

/** Filesystem-safe slug for a member's filename. */
export function safeName(value) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "member"
  );
}
