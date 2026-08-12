import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Download, Users } from "lucide-react";
import { requireExecutive } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Submission, Team } from "@/lib/types";
import { TeamForm } from "./team-form";

export const metadata: Metadata = { title: "Teams" };

/**
 * The team roster.
 *
 * Teams could previously only be created by running scripts/import-teams.mjs,
 * which is fine for the bulk import off the registration spreadsheet and no
 * use at all for the team that turns up on the morning having registered as
 * two teams that merged.
 */

type TeamWithSubmission = Team & { submissions: Submission[] | Submission | null };

function firstSubmission(row: TeamWithSubmission): Submission | null {
  const embedded = row.submissions;
  if (!embedded) return null;
  return Array.isArray(embedded) ? (embedded[0] ?? null) : embedded;
}

export default async function AdminTeamsPage(props: PageProps<"/admin/teams">) {
  await requireExecutive();
  const params = await props.searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";

  const supabase = await createClient();

  let request = supabase
    .from("teams")
    .select("*, submissions(status)")
    .order("code");

  if (query) {
    const escaped = query.replace(/[(),*]/g, " ").trim();
    if (escaped) {
      request = request.or(
        `name.ilike.%${escaped}%,code.ilike.%${escaped}%,institution.ilike.%${escaped}%`,
      );
    }
  }

  const [{ data: teamRows }, { data: memberRows }] = await Promise.all([
    request,
    supabase.from("profiles").select("team_id"),
  ]);

  const teams = (teamRows ?? []) as TeamWithSubmission[];

  const memberCounts = new Map<string, number>();
  let unassigned = 0;
  for (const row of memberRows ?? []) {
    const teamId = row.team_id as string | null;
    if (!teamId) {
      unassigned += 1;
      continue;
    }
    memberCounts.set(teamId, (memberCounts.get(teamId) ?? 0) + 1);
  }

  const withoutMembers = teams.filter(
    (team) => (memberCounts.get(team.id) ?? 0) === 0,
  ).length;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <Users size={22} className="text-brand" aria-hidden />
        Teams
      </h1>
      <p className="mt-1 text-sm text-muted">
        Rooms, table numbers and who is on which team. One submission per team.
      </p>

      <section className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Teams" value={teams.length} />
        <Stat label="Empty" value={withoutMembers} />
        <Stat label="Unassigned" value={unassigned} />
      </section>

      {unassigned > 0 && (
        <p className="mt-3 rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning">
          {unassigned} {unassigned === 1 ? "member is" : "members are"} not on a
          team yet. They cannot submit a project until they are — open a team and
          add them from there.
        </p>
      )}

      {/* Create ---------------------------------------------------------- */}
      <section id="create" className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-semibold">Add a team</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          The code is what the desk reads off the table tent, so keep it short.
        </p>
        <div className="mt-4">
          <TeamForm />
        </div>
      </section>

      {/* Search ---------------------------------------------------------- */}
      <form method="get" className="mt-8 flex flex-wrap gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search name, code or institution"
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand"
        />
        <button
          type="submit"
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong"
        >
          Search
        </button>
      </form>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        {query && (
          <Link href="/admin/teams" className="text-xs text-muted underline">
            Clear search
          </Link>
        )}
        <a
          href="/api/admin/submissions"
          className="ml-auto inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-brand/40"
        >
          <Download size={15} aria-hidden />
          Export CSV
        </a>
      </div>

      {/* List ------------------------------------------------------------ */}
      <p className="mt-6 text-sm text-muted">
        {teams.length} {teams.length === 1 ? "team" : "teams"}
      </p>

      {teams.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
          {query
            ? "No teams match that search."
            : "No teams yet. Add one above, or bulk import with scripts/import-teams.mjs."}
        </p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {teams.map((team) => {
            const submission = firstSubmission(team);
            const members = memberCounts.get(team.id) ?? 0;

            return (
              <li key={team.id}>
                <Link
                  href={`/admin/teams/${team.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-brand/40"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold leading-tight">
                      <span className="font-mono text-brand">{team.code}</span>{" "}
                      {team.name}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {[
                        `${members} ${members === 1 ? "member" : "members"}`,
                        team.room,
                        team.table_number && `Table ${team.table_number}`,
                        team.track,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>

                  {submission?.status === "submitted" && (
                    <span className="shrink-0 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
                      Submitted
                    </span>
                  )}
                  {members === 0 && (
                    <span className="shrink-0 rounded-full border border-warning/30 px-2.5 py-1 text-[11px] font-semibold text-warning">
                      Empty
                    </span>
                  )}

                  <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-6 text-xs text-muted">
        <Link href="/admin" className="font-medium text-brand hover:underline">
          Back to admin
        </Link>
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 text-center">
      <p className="font-mono text-2xl font-extrabold tabular-nums text-brand">
        {value}
      </p>
      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}
