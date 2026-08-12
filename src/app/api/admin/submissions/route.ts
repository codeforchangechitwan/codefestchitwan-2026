import { NextResponse } from "next/server";
import { requireExecutiveApi } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { csvBody, csvResponse, type CsvColumn } from "@/lib/csv";
import type { Submission, Team } from "@/lib/types";

/**
 * CSV of every team and its submission, for the organising team's records.
 *
 * Guarded in-route rather than through the proxy's PROTECTED_PREFIXES: a
 * download should answer with a status code, not a redirect to the login page.
 */

type TeamWithSubmission = Team & { submissions: Submission[] | Submission | null };

/** The row shape the columns read: a team beside its resolved submission. */
type ExportRow = { team: TeamWithSubmission; submission: Submission | null };

function firstSubmission(row: TeamWithSubmission): Submission | null {
  const embedded = row.submissions;
  if (!embedded) return null;
  return Array.isArray(embedded) ? (embedded[0] ?? null) : embedded;
}

const COLUMNS: CsvColumn<ExportRow>[] = [
  { key: "team_code", get: ({ team }) => team.code },
  { key: "team_name", get: ({ team }) => team.name },
  { key: "institution", get: ({ team }) => team.institution },
  { key: "track", get: ({ team }) => team.track },
  { key: "room", get: ({ team }) => team.room },
  { key: "table_number", get: ({ team }) => team.table_number },
  { key: "pitch_order", get: ({ team }) => team.pitch_order },
  { key: "status", get: ({ submission: s }) => (s ? s.status : "missing") },
  { key: "title", get: ({ submission: s }) => s?.title },
  { key: "repo_url", get: ({ submission: s }) => s?.repo_url },
  { key: "demo_url", get: ({ submission: s }) => s?.demo_url },
  { key: "video_url", get: ({ submission: s }) => s?.video_url },
  { key: "deck_url", get: ({ submission: s }) => s?.deck_url },
  { key: "docs_url", get: ({ submission: s }) => s?.docs_url },
  { key: "screenshots", get: ({ submission: s }) => s?.screenshots?.join(" ") },
  { key: "submitted_at", get: ({ submission: s }) => s?.submitted_at },
];

export async function GET() {
  const { response } = await requireExecutiveApi();
  if (response) return response;

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

  const rows: ExportRow[] = ((data ?? []) as TeamWithSubmission[]).map((team) => ({
    team,
    submission: firstSubmission(team),
  }));

  return csvResponse("codefest-2026-submissions.csv", csvBody(COLUMNS, rows));
}
