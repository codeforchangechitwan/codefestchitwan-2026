import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireExecutive } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Submission, Team } from "@/lib/types";
import { TeamForm } from "../team-form";
import { TeamRoster, type RosterMember } from "./team-roster";

export const metadata: Metadata = { title: "Team" };

export default async function AdminTeamPage(props: PageProps<"/admin/teams/[id]">) {
  await requireExecutive();
  const { id } = await props.params;

  const supabase = await createClient();

  const [{ data: teamRow }, { data: memberRows }, { data: submissionRow }] =
    await Promise.all([
      supabase.from("teams").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("profiles")
        .select("id, full_name, email, role, checked_in_at")
        .eq("team_id", id)
        .order("full_name"),
      supabase.from("submissions").select("*").eq("team_id", id).maybeSingle(),
    ]);

  if (!teamRow) notFound();

  const team = teamRow as Team;
  const members = (memberRows ?? []) as RosterMember[];
  const submission = submissionRow as Submission | null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <p className="text-xs text-muted">
        <Link href="/admin/teams" className="font-medium text-brand hover:underline">
          Teams
        </Link>
      </p>

      <h1 className="mt-1 text-2xl font-bold tracking-tight">
        <span className="font-mono text-brand">{team.code}</span> {team.name}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {[team.institution, team.room, team.table_number && `Table ${team.table_number}`]
          .filter(Boolean)
          .join(" · ") || "No room or table assigned yet"}
      </p>

      {/* Submission ------------------------------------------------------- */}
      <section className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-semibold">Submission</h2>
        {submission ? (
          <>
            <p className="mt-1 text-sm">
              <span
                className={`mr-2 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  submission.status === "submitted"
                    ? "bg-success/10 text-success"
                    : "border border-border text-muted"
                }`}
              >
                {submission.status === "submitted" ? "Submitted" : "Draft"}
              </span>
              {submission.title || "Untitled"}
            </p>
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
          </>
        ) : (
          <p className="mt-1 text-sm text-muted">Nothing submitted yet.</p>
        )}
      </section>

      {/* Roster and delete ------------------------------------------------ */}
      <div className="mt-6">
        <TeamRoster teamId={team.id} teamName={team.name} members={members} />
      </div>

      {/* Details ---------------------------------------------------------- */}
      <section className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-semibold">Details</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Renaming the team updates it everywhere, including each member&rsquo;s
          card and the pitch running order.
        </p>
        <div className="mt-4">
          <TeamForm team={team} />
        </div>
      </section>
    </div>
  );
}
