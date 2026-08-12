import type { Metadata } from "next";
import Link from "next/link";
import { Download, ExternalLink } from "lucide-react";
import { requireExecutive } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { EventSettings, Submission, Team } from "@/lib/types";
import { WindowControl } from "./window-control";

export const metadata: Metadata = { title: "Submissions" };

const KATHMANDU = "Asia/Kathmandu";

type TeamWithSubmission = Team & { submissions: Submission[] | Submission | null };

/** PostgREST returns an embedded one-to-one as either an object or an array. */
function firstSubmission(row: TeamWithSubmission): Submission | null {
  const embedded = row.submissions;
  if (!embedded) return null;
  return Array.isArray(embedded) ? (embedded[0] ?? null) : embedded;
}

export default async function AdminSubmissionsPage(
  props: PageProps<"/admin/submissions">,
) {
  await requireExecutive();
  const params = await props.searchParams;
  const filter = typeof params.status === "string" ? params.status : "all";

  const supabase = await createClient();

  const [{ data: teamRows }, { data: settingsRow }] = await Promise.all([
    supabase.from("teams").select("*, submissions(*)").order("code"),
    supabase
      .from("event_settings")
      .select("submission_deadline, submissions_open")
      .maybeSingle(),
  ]);

  const teams = (teamRows ?? []) as TeamWithSubmission[];
  const settings = settingsRow as EventSettings | null;

  const rows = teams.map((team) => ({ team, submission: firstSubmission(team) }));

  const submitted = rows.filter((r) => r.submission?.status === "submitted").length;
  const drafts = rows.filter((r) => r.submission?.status === "draft").length;
  const missing = rows.filter((r) => !r.submission).length;

  const visible = rows.filter(({ submission }) => {
    if (filter === "submitted") return submission?.status === "submitted";
    if (filter === "draft") return submission?.status === "draft";
    if (filter === "missing") return !submission;
    return true;
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Submissions</h1>
      <p className="mt-1 text-sm text-muted">
        One per team. Judging is on paper — this is the intake record.
      </p>

      <section className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Submitted" value={submitted} />
        <Stat label="Draft" value={drafts} />
        <Stat label="Missing" value={missing} />
      </section>

      {settings && (
        <div className="mt-6">
          <WindowControl
            deadline={settings.submission_deadline}
            open={settings.submissions_open}
          />
        </div>
      )}

      {/* Filter + export --------------------------------------------------- */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <form method="get" className="flex gap-2">
          <select
            name="status"
            defaultValue={filter}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
          >
            <option value="all">All teams</option>
            <option value="submitted">Submitted</option>
            <option value="draft">Draft only</option>
            <option value="missing">Missing</option>
          </select>
          <button
            type="submit"
            className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-brand/40"
          >
            Filter
          </button>
        </form>

        <a
          href="/api/admin/submissions"
          className="ml-auto inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-brand/40"
        >
          <Download size={15} aria-hidden />
          Export CSV
        </a>
      </div>

      {/* Rows -------------------------------------------------------------- */}
      {visible.length === 0 ? (
        <p className="mt-4 rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          {teams.length === 0
            ? "No teams imported yet — run scripts/import-teams.mjs."
            : "No teams match that filter."}
        </p>
      ) : (
        <ul className="mt-4 grid gap-2">
          {visible.map(({ team, submission }) => (
            <li key={team.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-start gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold leading-tight">
                    <span className="font-mono text-brand">{team.code}</span>{" "}
                    {team.name}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {[team.room, team.table_number && `Table ${team.table_number}`, team.track]
                      .filter(Boolean)
                      .join(" · ") || "No room assigned"}
                  </span>
                </span>
                <StatusPill submission={submission} />
              </div>

              {submission && (
                <>
                  {submission.title && (
                    <p className="mt-2 text-sm font-medium">{submission.title}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    {(
                      [
                        ["Repo", submission.repo_url],
                        ["Demo", submission.demo_url],
                        ["Video", submission.video_url],
                        ["Deck", submission.deck_url],
                        ["Docs", submission.docs_url],
                      ] as const
                    ).map(([label, href]) =>
                      href ? (
                        <a
                          key={label}
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
                        >
                          {label}
                          <ExternalLink size={11} aria-hidden />
                        </a>
                      ) : null,
                    )}
                  </div>
                  {submission.submitted_at && (
                    <p className="mt-2 text-[11px] text-muted">
                      Submitted{" "}
                      {new Intl.DateTimeFormat("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: KATHMANDU,
                      }).format(new Date(submission.submitted_at))}
                    </p>
                  )}
                </>
              )}
            </li>
          ))}
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

function StatusPill({ submission }: { submission: Submission | null }) {
  if (!submission) {
    return (
      <span className="shrink-0 rounded-full border border-danger/30 bg-danger/10 px-3 py-1 text-xs font-semibold text-danger">
        Missing
      </span>
    );
  }
  if (submission.status === "submitted") {
    return (
      <span className="shrink-0 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
        Submitted
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted">
      Draft
    </span>
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
