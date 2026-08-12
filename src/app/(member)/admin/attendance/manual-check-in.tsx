"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { BadgeCheck, Loader2, Search, UserRoundCheck } from "lucide-react";
import {
  DIRECTION_LABELS,
  ROLE_LABELS,
  SCAN_DIRECTIONS,
  STATIONS,
  STATION_LABELS,
  type ScanDirection,
  type Station,
} from "@/lib/types";
import { manualScan, searchMembers, type MemberMatch } from "./actions";

/**
 * Check someone in without a card.
 *
 * Search is debounced rather than submitted, because the case this exists for
 * is a queue: the volunteer is typing a name they are hearing out loud, and
 * making them press a button between every correction costs more than the
 * round trips do.
 */
export function ManualCheckIn() {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<MemberMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [station, setStation] = useState<Station>("registration");
  const [direction, setDirection] = useState<ScanDirection>("in");
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
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
        const results = await searchMembers(term);
        if (id === latest.current) setMatches(results);
      } finally {
        if (id === latest.current) setSearching(false);
      }
    }, 250);
  }

  function clearSearch() {
    if (timer.current) clearTimeout(timer.current);
    latest.current += 1;
    setQuery("");
    setMatches([]);
    setSearching(false);
  }

  function record(member: MemberMatch) {
    setPendingId(member.id);
    setNotice(null);
    startTransition(async () => {
      const result = await manualScan(member.id, station, direction);
      setNotice(result);
      setPendingId(null);
      if (result.ok) clearSearch();
    });
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <UserRoundCheck size={17} className="text-brand" aria-hidden />
        Check in without a card
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        For a lost lanyard or a camera that will not focus. Records exactly the
        same scan the desk scanner would.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="manual-station">
          Station
        </label>
        <select
          id="manual-station"
          value={station}
          onChange={(event) => setStation(event.target.value as Station)}
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand"
        >
          {STATIONS.map((value) => (
            <option key={value} value={value}>
              {STATION_LABELS[value]}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="manual-direction">
          Direction
        </label>
        <select
          id="manual-direction"
          value={direction}
          onChange={(event) => setDirection(event.target.value as ScanDirection)}
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand"
        >
          {SCAN_DIRECTIONS.map((value) => (
            <option key={value} value={value}>
              {DIRECTION_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      <div className="relative mt-2">
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
          aria-label="Search for a member to check in"
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
          {matches.map((member) => (
            <li key={member.id}>
              <button
                type="button"
                onClick={() => record(member)}
                disabled={pendingId !== null}
                className="flex w-full items-center gap-3 rounded-xl border border-border px-4 py-3 text-left transition-colors hover:border-brand/40 disabled:opacity-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold leading-tight">
                      {member.full_name}
                    </span>
                    {member.checked_in_at && (
                      <BadgeCheck
                        size={13}
                        className="shrink-0 text-success"
                        aria-label="Already checked in"
                      />
                    )}
                    {!member.is_active && (
                      <span className="shrink-0 rounded bg-danger/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-danger">
                        Suspended
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {[ROLE_LABELS[member.role], member.team_name]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                {pendingId === member.id ? (
                  <Loader2 size={15} className="shrink-0 animate-spin" aria-hidden />
                ) : (
                  <span className="shrink-0 rounded-full bg-brand px-3 py-1 text-[11px] font-semibold text-white">
                    Record
                  </span>
                )}
              </button>
            </li>
          ))}
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
  );
}
