import type { Metadata } from "next";
import Link from "next/link";
import { Download, ExternalLink, GitFork } from "lucide-react";
import { requireExecutive } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { githubProfileUrl } from "@/lib/github";
import type { Profile, Team } from "@/lib/types";

export const metadata: Metadata = { title: "GitHub profiles" };

/**
 * Every team's GitHub handles, grouped by team.
 *
 * Participants post their own from /profile, so this page is a completeness
 * check as much as a directory: the useful question the day before judging is
 * which teams have nobody posted yet, which is why members without a handle are
 * listed too rather than filtered out.
 */
export default async function AdminGithubPage(props: PageProps<"/admin/github">) {
  await requireExecutive();
  const params = await props.searchParams;
  const filter = typeof params.show === "string" ? params.show : "all";

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

  const groups = teams.map((team) => {
    const members = profiles.filter((p) => p.team_id === team.id);
    return {
      team,
      members,
      posted: members.filter((m) => m.github_username).length,
    };
  });

  const totalMembers = groups.reduce((n, g) => n + g.members.length, 0);
  const totalPosted = groups.reduce((n, g) => n + g.posted, 0);
  const teamsComplete = groups.filter(
    (g) => g.members.length > 0 && g.posted === g.members.length,
  ).length;
  const teamsEmpty = groups.filter((g) => g.posted === 0).length;

  const visible = groups.filter((g) => {
    if (filter === "missing") return g.posted < g.members.length;
    if (filter === "none") return g.posted === 0;
    return true;
  });

  const TABS = [
    { key: "all", label: `All ${groups.length}` },
    { key: "missing", label: "Incomplete" },
    { key: "none", label: `Nothing posted ${teamsEmpty}` },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">GitHub profiles</h1>
      <p className="mt-1 text-sm text-muted">
        Posted by participants themselves from their profile page.
      </p>

      <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Posted", value: `${totalPosted}/${totalMembers}` },
          { label: "Teams complete", value: `${teamsComplete}/${groups.length}` },
          { label: "Teams with none", value: teamsEmpty },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border bg-surface px-3 py-4"
          >
            <dt className="text-[11px] uppercase tracking-wide text-muted">
              {stat.label}
            </dt>
            <dd className="mt-1 font-mono text-lg font-bold tabular-nums text-brand">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === "all" ? "/admin/github" : `/admin/github?show=${tab.key}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === tab.key
                ? "border-brand bg-brand-soft text-brand"
                : "border-border text-muted hover:border-brand/40"
            }`}
          >
            {tab.label}
          </Link>
        ))}

        <a
          href="/api/admin/github"
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition-colors hover:border-brand/40"
        >
          <Download size={13} aria-hidden />
          CSV
        </a>
      </div>

      {visible.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
          Nothing to show — every team has posted.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {visible.map(({ team, members, posted }) => (
            <li
              key={team.id}
              className="overflow-hidden rounded-2xl border border-border bg-surface"
            >
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold leading-tight">
                    <span className="font-mono text-brand">{team.code}</span>{" "}
                    {team.name}
                  </span>
                  {team.institution && (
                    <span className="block truncate text-xs text-muted">
                      {team.institution}
                    </span>
                  )}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    posted === members.length
                      ? "bg-success/10 text-success"
                      : posted === 0
                        ? "border border-warning/30 text-warning"
                        : "bg-brand-soft text-brand"
                  }`}
                >
                  {posted}/{members.length}
                </span>
              </div>

              <ul className="divide-y divide-border">
                {members.map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm"
                  >
                    <span className="w-20 shrink-0 font-mono text-xs text-brand">
                      {member.participant_code ?? "—"}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {member.full_name}
                    </span>

                    {member.github_username ? (
                      <a
                        href={githubProfileUrl(member.github_username)}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex shrink-0 items-center gap-1.5 font-mono text-xs font-semibold text-brand hover:underline"
                      >
                        <GitFork size={13} aria-hidden />
                        {member.github_username}
                        <ExternalLink size={11} aria-hidden />
                      </a>
                    ) : (
                      <span className="shrink-0 text-xs text-muted">Not posted</span>
                    )}
                  </li>
                ))}
              </ul>
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
