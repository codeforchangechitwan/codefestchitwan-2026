"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, Trash2, UserMinus, UserPlus } from "lucide-react";
import { ROLE_LABELS, type Role } from "@/lib/types";
import {
  deleteTeam,
  searchMembersForTeam,
  setMemberTeam,
  type UnassignedMember,
} from "../actions";

export type RosterMember = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  checked_in_at: string | null;
};

/**
 * Who is on this team, plus the search box that puts someone else on it.
 *
 * A member already on another team is shown with that team's name rather than
 * hidden: the common case for this box is a participant who registered under
 * the wrong team, and hiding them would look like they had no account at all.
 */
export function TeamRoster({
  teamId,
  teamName,
  members,
}: {
  teamId: string;
  teamName: string;
  members: RosterMember[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<UnassignedMember[]>([]);
  const [searching, setSearching] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [, startTransition] = useTransition();

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Bumped per keystroke so a slow reply cannot overwrite a newer one. */
  const latest = useRef(0);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function search(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);

    const term = value.trim();
    if (term.length < 2) {
      setMatches([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const id = ++latest.current;

    timer.current = setTimeout(async () => {
      try {
        const results = await searchMembersForTeam(term);
        if (id === latest.current) setMatches(results);
      } finally {
        if (id === latest.current) setSearching(false);
      }
    }, 250);
  }

  function run(id: string, action: () => Promise<{ ok: boolean; message: string }>) {
    setPendingId(id);
    setNotice(null);
    startTransition(async () => {
      const result = await action();
      setNotice(result);
      setPendingId(null);
      if (result.ok) {
        if (timer.current) clearTimeout(timer.current);
        latest.current += 1;
        setQuery("");
        setMatches([]);
        setSearching(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-semibold">
          Members{" "}
          <span className="font-normal text-muted">
            ({members.length})
          </span>
        </h2>

        {members.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Nobody on this team yet. Add them below.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex items-center gap-3 rounded-xl border border-border px-4 py-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold leading-tight">
                    {member.full_name}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {ROLE_LABELS[member.role]} · {member.email}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => run(member.id, () => setMemberTeam(member.id, null))}
                  disabled={pendingId !== null}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-50"
                >
                  {pendingId === member.id ? (
                    <Loader2 size={13} className="animate-spin" aria-hidden />
                  ) : (
                    <UserMinus size={13} aria-hidden />
                  )}
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <UserPlus size={17} className="text-brand" aria-hidden />
          Add a member
        </h2>

        <div className="relative mt-3">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => search(event.target.value)}
            placeholder="Search name or email"
            aria-label={`Search for a member to add to ${teamName}`}
            className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand"
          />
        </div>

        {searching && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted">
            <Loader2 size={12} className="animate-spin" aria-hidden />
            Searching…
          </p>
        )}

        {!searching && query.trim().length >= 2 && matches.length === 0 && (
          <p className="mt-3 text-sm text-muted">Nobody matches that.</p>
        )}

        {matches.length > 0 && (
          <ul className="mt-3 grid gap-2">
            {matches.map((member) => {
              const alreadyHere = member.team_id === teamId;

              return (
                <li key={member.id}>
                  <button
                    type="button"
                    onClick={() => run(member.id, () => setMemberTeam(member.id, teamId))}
                    disabled={pendingId !== null || alreadyHere}
                    className="flex w-full items-center gap-3 rounded-xl border border-border px-4 py-3 text-left transition-colors hover:border-brand/40 disabled:opacity-50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold leading-tight">
                        {member.full_name}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {alreadyHere
                          ? "Already on this team"
                          : member.team_name
                            ? `Currently on ${member.team_name}`
                            : ROLE_LABELS[member.role]}
                      </span>
                    </span>
                    {pendingId === member.id ? (
                      <Loader2 size={15} className="shrink-0 animate-spin" aria-hidden />
                    ) : (
                      !alreadyHere && (
                        <span className="shrink-0 rounded-full bg-brand px-3 py-1 text-[11px] font-semibold text-white">
                          {member.team_id ? "Move here" : "Add"}
                        </span>
                      )
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {notice && (
          <p
            role="status"
            className={`mt-3 rounded-xl px-3 py-2 text-sm ${
              notice.ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
            }`}
          >
            {notice.message}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-danger/30 bg-surface p-5">
        <h2 className="font-semibold text-danger">Delete this team</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Members are kept — they become unassigned and can be put on another
          team. A team with a submission cannot be deleted.
        </p>

        {confirmingDelete ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                run(teamId, async () => {
                  const result = await deleteTeam(teamId);
                  if (result.ok) router.push("/admin/teams");
                  return result;
                })
              }
              disabled={pendingId !== null}
              className="inline-flex items-center gap-1.5 rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {pendingId === teamId ? (
                <Loader2 size={14} className="animate-spin" aria-hidden />
              ) : (
                <Trash2 size={14} aria-hidden />
              )}
              Yes, delete {teamName}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-danger/30 px-4 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger/5"
          >
            <Trash2 size={14} aria-hidden />
            Delete team
          </button>
        )}
      </section>
    </div>
  );
}
