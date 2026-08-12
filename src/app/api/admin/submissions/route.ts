import { NextResponse } from "next/server";
import { createClient, getSessionProfile } from "@/lib/supabase/server";
import type { Submission, Team } from "@/lib/types";

/**
 * CSV of every team and its submission, for the organising team's records.
 *
 * Guarded in-route rather than through the proxy's PROTECTED_PREFIXES: a
 * download should answer with a status code, not a redirect to the login page.
 */

type TeamWithSubmission = Team & { submissions: Submission[] | Submission | null };

function firstSubmission(row: TeamWithSubmission): Submission | null {
  const embedded = row.submissions;
  if (!embedded) return null;
  return Array.isArray(embedded) ? (embedded[0] ?? null) : embedded;
}

/** RFC 4180: wrap in quotes and double any quote inside. */
function cell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * One definition per column, so the header and the row can never drift apart.
 * They were two positional arrays and adding a field meant editing both.
 */
const COLUMNS: {
  key: string;
  get: (
    team: TeamWithSubmission,
    submission: Submission | null,
  ) => string | number | null | undefined;
}[] = [
  { key: "team_code", get: (t) => t.code },
  { key: "team_name", get: (t) => t.name },
  { key: "institution", get: (t) => t.institution },
  { key: "track", get: (t) => t.track },
  { key: "room", get: (t) => t.room },
  { key: "table_number", get: (t) => t.table_number },
  { key: "pitch_order", get: (t) => t.pitch_order },
  { key: "status", get: (_t, s) => (s ? s.status : "missing") },
  { key: "title", get: (_t, s) => s?.title },
  { key: "repo_url", get: (_t, s) => s?.repo_url },
  { key: "demo_url", get: (_t, s) => s?.demo_url },
  { key: "video_url", get: (_t, s) => s?.video_url },
  { key: "deck_url", get: (_t, s) => s?.deck_url },
  { key: "docs_url", get: (_t, s) => s?.docs_url },
  { key: "screenshots", get: (_t, s) => s?.screenshots?.join(" ") },
  { key: "submitted_at", get: (_t, s) => s?.submitted_at },
];

export async function GET() {
  const session = await getSessionProfile();
  if (!session) {
    return new NextResponse("Sign in first.", { status: 401 });
  }
  if (session.profile.role !== "executive") {
    return new NextResponse("Executives only.", { status: 403 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("*, submissions(*)")
    .order("code");

  if (error) {
    return new NextResponse(`Could not read submissions: ${error.message}`, {
      status: 500,
    });
  }

  const lines = [COLUMNS.map((column) => cell(column.key)).join(",")];

  for (const row of (data ?? []) as TeamWithSubmission[]) {
    const submission = firstSubmission(row);
    lines.push(
      COLUMNS.map((column) => cell(column.get(row, submission))).join(","),
    );
  }

  // BOM so Excel opens UTF-8 team names correctly.
  return new NextResponse(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Content-Disposition": 'attachment; filename="codefest-2026-submissions.csv"',
    },
  });
}
