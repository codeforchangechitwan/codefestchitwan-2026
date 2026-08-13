import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  MapPin,
  Table2,
  Users,
} from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS } from "@/lib/types";
import type { Team, TeamMember } from "@/lib/types";

export const metadata: Metadata = { title: "My team" };

export default async function TeamPage() {
  const { profile } = await requireMember();

  if (!profile.team_id) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">My team</h1>
        <div className="mt-6 rounded-2xl border border-border bg-surface p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Users size={22} aria-hidden />
          </span>
          <p className="mt-4 font-semibold">You&rsquo;re not on a team yet</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Teams come from the registration roster. If you think this is wrong,
            ask at the Registration Desk in Building A and the team will sort it
            out on the spot.
          </p>
        </div>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: teamRow }, { data: rosterRows }] = await Promise.all([
    supabase.from("teams").select("*").eq("id", profile.team_id).single(),
    supabase.rpc("team_roster"),
  ]);

  const team = teamRow as Team | null;
  const roster = (rosterRows ?? []) as TeamMember[];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">My team</h1>

      {/* Identity ---------------------------------------------------------- */}
      <section className="mt-4 rounded-2xl border border-border bg-surface p-5">
        <p className="text-sm text-muted">{team?.institution ?? "Codefest Chitwan"}</p>
        <p className="mt-0.5 text-xl font-bold leading-tight">
          {team?.name ?? profile.team_name}
        </p>

        {team?.code && (
          <p className="mt-3 font-mono text-2xl font-bold tracking-widest text-brand">
            {team.code}
          </p>
        )}
        <p className="mt-1 text-xs text-muted">
          Quote this code at the desk and on your submission.
        </p>

        <dl className="mt-4 grid gap-2 border-t border-border pt-4 text-sm sm:grid-cols-2">
          {team?.track && (
            <div>
              <dt className="text-xs text-muted">Track</dt>
              <dd className="font-medium">{team.track}</dd>
            </div>
          )}
          {team?.room && (
            <div>
              <dt className="flex items-center gap-1 text-xs text-muted">
                <MapPin size={11} aria-hidden />
                Room
              </dt>
              <dd className="font-medium">{team.room}</dd>
            </div>
          )}
          {team?.table_number && (
            <div>
              <dt className="flex items-center gap-1 text-xs text-muted">
                <Table2 size={11} aria-hidden />
                Table
              </dt>
              <dd className="font-medium">{team.table_number}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Roster ------------------------------------------------------------ */}
      <section className="mt-6">
        <h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-muted">
          <Users size={13} aria-hidden />
          Members ({roster.length})
        </h2>

        <ul className="mt-3 grid gap-2">
          {roster.map((member) => (
            <li
              key={member.profile_id}
              className={`flex items-center gap-3 rounded-xl border p-4 ${
                member.is_self ? "border-brand/40 bg-brand-soft" : "border-border bg-surface"
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold leading-tight">
                  {member.full_name}
                  {member.is_self && (
                    <span className="ml-1.5 text-xs font-medium text-muted">(you)</span>
                  )}
                </span>
                <span className="block truncate text-xs text-muted">
                  {member.participant_code && (
                    <span className="font-mono text-brand">
                      {member.participant_code}
                      {" · "}
                    </span>
                  )}
                  {ROLE_LABELS[member.role]}
                  {member.institution ? ` · ${member.institution}` : ""}
                </span>
              </span>
              {member.checked_in_at && (
                <span
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success"
                  title="Checked in at the desk"
                >
                  <BadgeCheck size={12} aria-hidden />
                  In
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <Link
        href="/submit"
        className="group mt-6 flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-brand/40"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-semibold leading-tight">Project submission</span>
          <span className="block truncate text-xs text-muted">
            Repo, demo link and description
          </span>
        </span>
        <ArrowRight
          size={16}
          aria-hidden
          className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
        />
      </Link>
    </div>
  );
}
