import { NextResponse } from "next/server";

/**
 * CSV writing shared by the organisers' three exports.
 *
 * Everything the organising team does with this data happens in a spreadsheet,
 * so the output targets Excel specifically: CRLF line endings, quoted cells,
 * and a byte-order mark so Devanagari team names and Nepali institution names
 * open as UTF-8 instead of mojibake.
 */

/** RFC 4180: wrap in quotes and double any quote inside. */
export function csvCell(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) return '""';
  const text = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * One definition per column, so a header and its row can never drift apart —
 * they used to be two positional arrays and adding a field meant editing both.
 */
export type CsvColumn<T> = {
  key: string;
  get: (row: T) => string | number | boolean | null | undefined;
};

export function csvBody<T>(columns: CsvColumn<T>[], rows: T[]) {
  const lines = [columns.map((column) => csvCell(column.key)).join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvCell(column.get(row))).join(","));
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}

export function csvResponse(filename: string, body: string) {
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      // Personal data: never store in a shared cache.
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
