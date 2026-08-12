import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Gavel, Lock } from "lucide-react";
import { requireJudge } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { EventSettings, Submission, Team } from "@/lib/types";

export const metadata: Metadata = { title: "Judging" };

/**
 * What the panel sees on Sunday.
 *
 * Read-only on purpose: scoring is on paper this year, so this is the entry
 * list the judges work from, not a scoring system. Access is gated in the
 * database, not here — `submissions_read` only returns rows to a judge while
 * `judging_open` is true, so a judge who opens this page early gets an empty
 * list from Postgres rather than a page that merely declines to render one.
 */

const KATHMANDU = "Asia/Kathmandu";

type TeamWithSubmission = Team & { submissions: Submission[] | Submission | null };

function firstSubmission(row: TeamWithSubmission): Submission | null {
  const embedded = row.submissions;
  if (!embedded) return null;
  return Array.isArray(embedded) ? (embedded[0] ?? null) : embedded;
}

export default async function JudgePage() {
  const { profile } = await requireJudge();
  const supabase = await createClient();

  const [{ data: settingsRow }, { data: teamRows }] = await Promise.all([
    supabase.from("event_settings").select("*").maybeSingle(),
    supabase.from("teams").select("*, submissions(*)").order("pitch_order", {
      ascending: true,
      nullsFirst: false,
    }),
  ]);

  const settings = settingsRow as (EventSettings & { judging_open: boolean }) | null;
  const judgingOpen = settings?.judging_open ?? false;

  const entries = ((teamRows ?? []) as TeamWithSubmission[])
    .map((team) => ({ team, submission: firstSubmission(team) }))
    .filter(({ submission }) => submission?.status === "submitted");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <Gavel size={22} className="text-brand" aria-hidden />
        Judging
      </h1>
      <p className="mt-1 text-sm text-muted">
        Welcome, {profile.full_name}. Scoring is on paper — this is the entry
        list, in pitch order.
      </p>

      {!judgingOpen ? (
        <div className="mt-8 rounded-2xl border border-border bg-surface px-4 py-10 text-center">
          <Lock size={22} className="mx-auto text-muted" aria-hidden />
          <p className="mt-3 font-semibold">Judging has not opened yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted">
            Entries appear here once the organisers close submissions and open
            judging. That happens at the briefing on Sunday morning, in the Main
            Hall.
          </p>
        </div>
      ) : entries.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
          Judging is open, but no team has submitted yet.
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-muted">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </p>

          <ul className="mt-3 grid gap-3">
            {entries.map(({ team, submission }) => (
              <li
                key={team.id}
                className="rounded-2xl border border-border bg-surface p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold leading-tight">
                      <span className="font-mono text-brand">{team.code}</span>{" "}
                      {team.name}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {[team.institution, team.track, team.room]
                        .filter(Boolean)
                        .join(" · ") || "No institution recorded"}
                    </span>
                  </span>
                  {team.pitch_order !== null && (
                    <span className="shrink-0 rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">
                      #{team.pitch_order}
                    </span>
                  )}
                </div>

                {submission?.title && (
                  <p className="mt-3 font-semibold">{submission.title}</p>
                )}
                {submission?.description && (
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted">
                    {submission.description}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  {(
                    [
                      ["Repository", submission?.repo_url],
                      ["Live demo", submission?.demo_url],
                      ["Demo video", submission?.video_url],
                      ["Pitch deck", submission?.deck_url],
                      ["Documentation", submission?.docs_url],
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
                        <ExternalLink size={12} aria-hidden />
                      </a>
                    ) : null,
                  )}
                </div>

                {submission?.screenshots && submission.screenshots.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    {submission.screenshots.map((url, index) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted underline hover:text-brand"
                      >
                        Screenshot {index + 1}
                      </a>
                    ))}
                  </div>
                )}

                {submission?.submitted_at && (
                  <p className="mt-3 text-[11px] text-muted">
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
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-8 text-xs text-muted">
        <Link href="/schedule" className="font-medium text-brand hover:underline">
          Sunday running order
        </Link>
      </p>
    </div>
  );
}
