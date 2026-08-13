import { requireExecutiveApi } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { csvBody, csvResponse, type CsvColumn } from "@/lib/csv";
import { githubProfileUrl } from "@/lib/github";
import type { Profile, Team } from "@/lib/types";

/**
 * CSV of every team member's GitHub handle, one row per person, ordered by team.
 *
 * People who have not posted one are still a row, with an empty handle: the
 * spreadsheet this ends up in is used to chase the gaps, so dropping them would
 * remove the only thing it is for.
 *
 * Guarded in-route rather than through the proxy's PROTECTED_PREFIXES: a
 * download should answer with a status code, not a redirect to the login page.
 */

type ExportRow = { team: Team; member: Profile };

const COLUMNS: CsvColumn<ExportRow>[] = [
  { key: "team_code", get: ({ team }) => team.code },
  { key: "team_name", get: ({ team }) => team.name },
  { key: "institution", get: ({ team }) => team.institution },
  { key: "participant_code", get: ({ member }) => member.participant_code },
  { key: "full_name", get: ({ member }) => member.full_name },
  { key: "title", get: ({ member }) => member.title },
  { key: "github_username", get: ({ member }) => member.github_username },
  {
    key: "github_url",
    get: ({ member }) =>
      member.github_username ? githubProfileUrl(member.github_username) : null,
  },
];

export async function GET() {
  const { response } = await requireExecutiveApi();
  if (response) return response;

  const supabase = await createClient();

  const [{ data: teamRows }, { data: profileRows }] = await Promise.all([
    supabase.from("teams").select("*").order("code"),
    supabase
      .from("profiles")
      .select("*")
      .not("team_id", "is", null)
      .order("participant_code"),
  ]);

  const teams = (teamRows ?? []) as Team[];
  const profiles = (profileRows ?? []) as Profile[];

  const rows: ExportRow[] = teams.flatMap((team) =>
    profiles
      .filter((member) => member.team_id === team.id)
      .map((member) => ({ team, member })),
  );

  return csvResponse(
    "codefest-2026-github-profiles.csv",
    csvBody(COLUMNS, rows),
  );
}
