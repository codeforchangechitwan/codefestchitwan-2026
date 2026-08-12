import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, FileText, Lock, Users } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { EventSettings, Submission, Team } from "@/lib/types";
import { SubmissionForm } from "./submission-form";
import { DeadlineCountdown } from "./deadline-countdown";

export const metadata: Metadata = { title: "Project submission" };

const KATHMANDU = "Asia/Kathmandu";

export default async function SubmitPage() {
  const { profile } = await requireMember();

  if (!profile.team_id) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Project submission</h1>
        <div className="mt-6 rounded-2xl border border-border bg-surface p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Users size={22} aria-hidden />
          </span>
          <p className="mt-4 font-semibold">You&rsquo;re not on a team yet</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Submissions are made by teams. Ask at the Registration Desk in
            Building A and they&rsquo;ll add you to your roster.
          </p>
        </div>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: teamRow }, { data: submissionRow }, { data: settingsRow }] =
    await Promise.all([
      supabase.from("teams").select("*").eq("id", profile.team_id).single(),
      supabase
        .from("submissions")
        .select("*")
        .eq("team_id", profile.team_id)
        .maybeSingle(),
      supabase
        .from("event_settings")
        .select("submission_deadline, submissions_open")
        .maybeSingle(),
    ]);

  const team = teamRow as Team | null;
  const submission = submissionRow as Submission | null;
  const settings = settingsRow as EventSettings | null;

  const deadline = settings?.submission_deadline ?? null;
  // Force-dynamic page: reading the clock per request is the point. This only
  // drives the UI — submissions_are_open() in the database is what actually
  // decides whether a write is allowed.
  const now = new Date().getTime();
  const isOpen =
    (settings?.submissions_open ?? false) &&
    deadline !== null &&
    new Date(deadline).getTime() > now;

  const deadlineLabel = deadline
    ? new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: KATHMANDU,
      }).format(new Date(deadline))
    : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Project submission</h1>
      <p className="mt-1 text-sm text-muted">
        One submission per team.{" "}
        <Link href="/team" className="font-medium text-brand hover:underline">
          {team?.name ?? profile.team_name}
        </Link>
        {team?.code ? ` · ${team.code}` : ""}
      </p>

      {/* Status ------------------------------------------------------------ */}
      <div className="mt-4 grid gap-2">
        {submission?.status === "submitted" ? (
          <p className="inline-flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">
            <BadgeCheck size={16} aria-hidden />
            Submitted
            {submission.submitted_at &&
              ` at ${new Intl.DateTimeFormat("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                day: "numeric",
                month: "short",
                timeZone: KATHMANDU,
              }).format(new Date(submission.submitted_at))}`}
          </p>
        ) : (
          <p className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
            <FileText size={16} aria-hidden />
            {submission ? "Draft saved — not submitted yet" : "Not started"}
          </p>
        )}

        {isOpen && deadline ? (
          <DeadlineCountdown deadline={deadline} />
        ) : (
          <p className="inline-flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
            <Lock size={16} aria-hidden />
            Submissions are closed. Speak to the desk in Building A.
          </p>
        )}
      </div>

      {deadlineLabel && (
        <p className="mt-2 text-xs text-muted">Deadline: {deadlineLabel} (NPT)</p>
      )}

      <SubmissionForm submission={submission} locked={!isOpen} />

      <p className="mt-6 text-xs leading-relaxed text-muted">
        You can save a draft as often as you like and keep editing after
        submitting, right up until the deadline. Judging happens live in the Main
        Hall — this record is what the organising team keeps.
      </p>
    </div>
  );
}
