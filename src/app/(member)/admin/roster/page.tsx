import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ContactRound, Search } from "lucide-react";
import { requireDeskStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatScanTime } from "@/lib/attendance";
import { ROLE_LABELS, type DirectoryEntry } from "@/lib/types";

export const metadata: Metadata = { title: "Roster" };

/**
 * Participant lookup for the desk.
 *
 * Volunteers run registration and the canteen, and until now could not answer
 * "am I even on the list?" — reading `profiles` is gated on is_executive(), so
 * a volunteer saw scan results and nothing else.
 *
 * Everything here comes from participant_directory(), a SECURITY DEFINER
 * projection that checks is_desk_staff() itself and cannot return qr_token,
 * allergies or medical notes. A volunteer given the raw table would be given a
 * working copy of every identity card in the building.
 */
export default async function RosterPage(props: PageProps<"/admin/roster">) {
  const { profile } = await requireDeskStaff();
  const params = await props.searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("participant_directory", {
    search: query || null,
  });

  const people = (data ?? []) as DirectoryEntry[];
  const checkedIn = people.filter((p) => p.checked_in_at !== null).length;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <ContactRound size={22} className="text-brand" aria-hidden />
        Roster
      </h1>
      <p className="mt-1 text-sm text-muted">
        Look somebody up when their card will not scan. Card tokens and medical
        notes are deliberately not shown here.
      </p>

      {error && (
        <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          Could not read the roster: {error.message}
        </p>
      )}

      <form method="get" className="mt-6 flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search name, email, team or ID"
            className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong"
        >
          Search
        </button>
      </form>

      {query && (
        <Link href="/admin/roster" className="mt-2 inline-block text-xs text-muted underline">
          Clear search
        </Link>
      )}

      <p className="mt-6 text-sm text-muted">
        {people.length} {people.length === 1 ? "person" : "people"} · {checkedIn}{" "}
        checked in
        {people.length === 200 && " · showing the first 200, narrow the search"}
      </p>

      {people.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
          {query ? "Nobody matches that." : "Nobody on the roster yet."}
        </p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {people.map((person) => (
            <li
              key={person.profile_id}
              className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate font-semibold leading-tight">
                    {person.full_name}
                  </span>
                  {person.checked_in_at && (
                    <BadgeCheck
                      size={14}
                      className="shrink-0 text-success"
                      aria-label="Checked in"
                    />
                  )}
                  {!person.is_active && (
                    <span className="shrink-0 rounded bg-danger/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-danger">
                      Suspended
                    </span>
                  )}
                </span>

                <span className="block truncate text-xs text-muted">
                  {person.participant_code && (
                    <span className="font-mono text-brand">
                      {person.participant_code}
                      {" · "}
                    </span>
                  )}
                  {[
                    person.title ?? ROLE_LABELS[person.role],
                    person.team_name,
                    person.room,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>

                <span className="block truncate text-[11px] text-muted">
                  {[person.email, person.phone].filter(Boolean).join(" · ")}
                </span>

                {person.checked_in_at && (
                  <span className="block text-[11px] text-muted">
                    First check-in {formatScanTime(person.checked_in_at)}
                  </span>
                )}
              </span>

              {person.food_preference && (
                <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted">
                  {person.food_preference}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs text-muted">
        <Link
          href={profile.role === "executive" ? "/admin" : "/admin/scan"}
          className="font-medium text-brand hover:underline"
        >
          {profile.role === "executive" ? "Back to admin" : "Back to the scanner"}
        </Link>
      </p>
    </div>
  );
}
