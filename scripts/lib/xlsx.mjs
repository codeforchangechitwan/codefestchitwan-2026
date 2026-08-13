/**
 * The smallest xlsx reader that does the one job this repo needs: turn a Google
 * Form "Responses" export into rows of plain strings.
 *
 * Why not a library: the import path is CSV end to end (see
 * import-registrations.mjs), and the only reason xlsx appears at all is that
 * Google hands you one when you click Download. Adding a spreadsheet engine to
 * a Next.js app the night before the event, to read one 21-row sheet, is a bad
 * trade. jszip is already a dependency — the rest is a few hundred bytes of
 * regex over XML we control the shape of.
 *
 * What it deliberately does not do: styles, dates, formulas, merged cells,
 * multiple sheets. Cells come back as strings, exactly as a CSV would give
 * them, and the caller decides what they mean.
 *
 * The one piece of real work is numeric cells. A phone number typed into a
 * Google Form arrives as a float, and its raw XML is "9.81146699E9". Left
 * alone that reaches the database as scientific notation; the participant then
 * cannot be found by phone at the desk. Every numeric cell is round-tripped
 * through Number so 9.81146699E9 becomes 9811466990 and "4.0" becomes "4".
 */

import fs from "node:fs";
import JSZip from "jszip";

const NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodeEntities(text) {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, entity) => {
    if (entity[0] !== "#") return NAMED_ENTITIES[entity] ?? whole;
    const hex = entity[1] === "x" || entity[1] === "X";
    const code = parseInt(hex ? entity.slice(2) : entity.slice(1), hex ? 16 : 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
  });
}

/** Concatenates every <t> in a fragment — rich text splits one string across runs. */
function textRuns(fragment) {
  let out = "";
  for (const match of fragment.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) {
    out += match[1];
  }
  return decodeEntities(out);
}

function readSharedStrings(xml) {
  if (!xml) return [];
  const strings = [];
  for (const match of xml.matchAll(/<si(?:\s[^>]*)?(?:\/>|>([\s\S]*?)<\/si>)/g)) {
    strings.push(match[1] === undefined ? "" : textRuns(match[1]));
  }
  return strings;
}

/** "AB12" -> 27. Stops at the first digit, so the row number is ignored. */
function columnIndex(ref) {
  let n = 0;
  for (const ch of ref) {
    const code = ch.charCodeAt(0);
    if (code < 65 || code > 90) break;
    n = n * 26 + (code - 64);
  }
  return n - 1;
}

function cellValue(attrs, body, shared) {
  if (body === undefined) return "";
  const type = /\bt="([^"]*)"/.exec(attrs)?.[1] ?? "n";

  if (type === "inlineStr") return textRuns(body);

  const raw = /<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(body)?.[1];
  if (raw === undefined) return "";
  const value = decodeEntities(raw);

  if (type === "s") return shared[Number(value)] ?? "";
  if (type === "str" || type === "e") return value;
  if (type === "b") return value === "1" ? "TRUE" : "FALSE";

  // Numeric: collapse the exponent form so phone numbers survive the trip.
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : value;
}

/** Resolves the first sheet through workbook.xml rather than guessing sheet1.xml. */
async function firstSheetPath(zip) {
  const workbook = await zip.file("xl/workbook.xml")?.async("string");
  const rels = await zip.file("xl/_rels/workbook.xml.rels")?.async("string");

  if (workbook && rels) {
    const relId = /<sheet\b[^>]*\br:id="([^"]+)"/.exec(workbook)?.[1];
    if (relId) {
      const pattern = new RegExp(
        `<Relationship\\b[^>]*\\bId="${relId}"[^>]*\\bTarget="([^"]+)"`,
      );
      const target = pattern.exec(rels)?.[1];
      if (target) return `xl/${target.replace(/^\.?\//, "")}`;
    }
  }

  return "xl/worksheets/sheet1.xml";
}

/**
 * Reads the first worksheet as a dense array of string rows, every row padded
 * to the width of the widest one so callers can index columns positionally
 * without guarding for undefined.
 */
export async function readSheetRows(filePath) {
  const zip = await JSZip.loadAsync(fs.readFileSync(filePath));
  const shared = readSharedStrings(
    await zip.file("xl/sharedStrings.xml")?.async("string"),
  );

  const sheetPath = await firstSheetPath(zip);
  const sheet = await zip.file(sheetPath)?.async("string");
  if (!sheet) throw new Error(`no worksheet at ${sheetPath} in ${filePath}`);

  const rows = [];
  let width = 0;

  for (const rowMatch of sheet.matchAll(
    /<row(?:\s[^>]*)?(?:\/>|>([\s\S]*?)<\/row>)/g,
  )) {
    const body = rowMatch[1];
    if (!body) continue;

    const cells = [];
    for (const cellMatch of body.matchAll(
      /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g,
    )) {
      const ref = /\br="([^"]+)"/.exec(cellMatch[1])?.[1];
      const index = ref ? columnIndex(ref) : cells.length;
      cells[index] = cellValue(cellMatch[1], cellMatch[2], shared);
    }

    if (cells.length === 0) continue;
    width = Math.max(width, cells.length);
    rows.push(cells);
  }

  return rows.map((cells) => {
    const dense = new Array(width);
    for (let i = 0; i < width; i += 1) dense[i] = cells[i] ?? "";
    return dense;
  });
}
