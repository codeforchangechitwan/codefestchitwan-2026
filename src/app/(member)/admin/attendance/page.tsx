import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Download, ScanLine } from "lucide-react";
import { requireExecutive } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  EVENT_DAYS,
  formatScanTime,
  kathmanduDayRange,
  STATION_FILTERS,
  stationKey,
  stationLabel,
} from "@/lib/attendance";
import { MEAL_LABELS, MEALS, ROLE_LABELS, isMeal, type Role } from "@/lib/types";
import { ManualCheckIn } from "./manual-check-in";

export const metadata: Metadata = { title: "Attendance" };

/**
 * Every scan `record_scan()` has ever written, which until now was recorded
 * and never shown anywhere.
 *
 * Executives only. The list joins each scan to a name, and reading the whole
 * profiles table is gated on `is_executive()` under RLS — a volunteer would
 * see rows of anonymous UUIDs, so the page asks for the role that can actually
 * render it.
 */

/** Rows pulled for the current filter before stats are computed over them. */
const MAX_ROWS = 2000;
const PAGE_SIZE = 50;

/** The spellings that mean "the registration desk", old and new. */
const REGISTRATION_ALIASES = ["registration", "registration-desk"];
const KNOWN_STATIONS = [...REGISTRATION_ALIASES, "exit", "canteen"];

type ScanRow = {
  id: string;
  created_at: string;
  station: string;
  direction: string;
  meal: string | null;
  profile_id: string;
  scanned_by: string | null;
};

type ProfileLite = {
  id: string;
  full_name: string;
  role: Role;
  team_name: string | null;
};

export default async function AttendancePage(
  props: PageProps<"/admin/attendance">,
) {
  await requireExecutive();
  const params = await props.searchParams;

  const single = (value: string | string[] | undefined) =>
    typeof value === "string" ? value : "";

  const dayFilter = single(params.day);
  const stationFilter = single(params.station);
  const directionFilter = single(params.direction);
  const mealFilter = single(params.meal);
  const query = single(params.q).trim();
  const rawPage = Number.parseInt(single(params.page), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const supabase = await createClient();

  // Name search resolves to profile ids first: the scan rows themselves hold
  // no name, and PostgREST cannot filter a parent table through an embed.
  let matchedIds: string[] | null = null;
  if (query) {
    const escaped = query.replace(/[(),*]/g, " ").trim();
    if (escaped) {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .or(`full_name.ilike.%${escaped}%,email.ilike.%${escaped}%`)
        .limit(200);
      matchedIds = (data ?? []).map((row) => row.id as string);
    } else {
      matchedIds = [];
    }
  }

  let request = supabase
    .from("check_ins")
    .select("id, created_at, station, direction, meal, profile_id, scanned_by")
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);

  const range = dayFilter ? kathmanduDayRange(dayFilter) : null;
  if (range) {
    request = request.gte("created_at", range.start).lt("created_at", range.end);
  }

  if (stationFilter === "registration") {
    request = request.in("station", REGISTRATION_ALIASES);
  } else if (stationFilter === "exit" || stationFilter === "canteen") {
    request = request.eq("station", stationFilter);
  } else if (stationFilter === "other") {
    request = request.not("station", "in", `(${KNOWN_STATIONS.join(",")})`);
  }

  if (directionFilter === "in" || directionFilter === "out") {
    request = request.eq("direction", directionFilter);
  }

  if (isMeal(mealFilter)) {
    request = request.eq("meal", mealFilter);
  }

  if (matchedIds !== null) {
    if (matchedIds.length === 0) {
      request = request.eq("profile_id", "00000000-0000-0000-0000-000000000000");
    } else {
      request = request.in("profile_id", matchedIds);
    }
  }

  const { data: scanRows, error } = await request;
  const scans = (scanRows ?? []) as ScanRow[];

  // One lookup covers both the person scanned and the volunteer who scanned
  // them: profiles.id is the auth user id, so both columns key the same table.
  const peopleIds = [
    ...new Set(
      scans.flatMap((scan) =>
        scan.scanned_by ? [scan.profile_id, scan.scanned_by] : [scan.profile_id],
      ),
    ),
  ];

  const people = new Map<string, ProfileLite>();
  if (peopleIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role, team_name")
      .in("id", peopleIds);
    for (const row of (data ?? []) as ProfileLite[]) people.set(row.id, row);
  }

  const uniquePeople = new Set(scans.map((scan) => scan.profile_id)).size;
  const arrivals = scans.filter((scan) => scan.direction !== "out").length;
  const departures = scans.length - arrivals;

  const byStation = STATION_FILTERS.map(({ value, label }) => ({
    value,
    label,
    count: scans.filter((scan) => stationKey(scan.station) === value).length,
  })).filter((entry) => entry.count > 0 || entry.value !== "other");

  /* Servings and unique people per sitting: the two numbers catering asks for. */
  const byMeal = MEALS.map((value) => {
    const rows = scans.filter((scan) => scan.meal === value);
    return {
      value,
      label: MEAL_LABELS[value],
      servings: rows.length,
      people: new Set(rows.map((r) => r.profile_id)).size,
    };
  }).filter((entry) => entry.servings > 0);

  const totalPages = Math.max(1, Math.ceil(scans.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = scans.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const filtersApplied = Boolean(
    dayFilter || stationFilter || directionFilter || mealFilter || query,
  );

  /**
   * The current filters with some of them changed. An empty string clears a
   * filter, so the station chips can toggle themselves off by passing one.
   */
  function hrefWith(overrides: Record<string, string | number>) {
    const current: Record<string, string> = {
      day: dayFilter,
      station: stationFilter,
      direction: directionFilter,
      meal: mealFilter,
      q: query,
      page: currentPage > 1 ? String(currentPage) : "",
      ...Object.fromEntries(
        Object.entries(overrides).map(([key, value]) => [key, String(value)]),
      ),
    };

    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(current)) {
      if (!value) continue;
      // Page one is the bare URL, so a shared link has no stale page number.
      if (key === "page" && value === "1") continue;
      search.set(key, value);
    }

    const suffix = search.toString();
    return suffix ? `/admin/attendance?${suffix}` : "/admin/attendance";
  }

  /** Page links keep every filter; changing a filter resets to page one. */
  const pageHref = (next: number) => hrefWith({ page: next });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <ScanLine size={22} className="text-brand" aria-hidden />
        Attendance
      </h1>
      <p className="mt-1 text-sm text-muted">
        Every card presented at every station. Nothing here is enforced — it is
        the record, not the gate.
      </p>

      {error && (
        <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          Could not read the scan log: {error.message}
        </p>
      )}

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Scans" value={scans.length} />
        <Stat label="People" value={uniquePeople} />
        <Stat label="In" value={arrivals} />
        <Stat label="Out" value={departures} />
      </section>

      <section className="mt-3 grid gap-2 sm:grid-cols-2">
        {byStation.map(({ value, label, count }) => (
          <Link
            key={value}
            href={hrefWith({
              station: stationFilter === value ? "" : value,
              page: 1,
            })}
            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition-colors ${
              stationFilter === value
                ? "border-brand/40 bg-brand-soft"
                : "border-border bg-surface hover:border-brand/40"
            }`}
          >
            <span>{label}</span>
            <span className="font-mono font-bold tabular-nums text-brand">
              {count}
            </span>
          </Link>
        ))}
      </section>

      {byMeal.length > 0 && (
        <section className="mt-3">
          <h2 className="text-[11px] font-bold uppercase tracking-wide text-muted">
            Sittings — servings, and how many people they fed
          </h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {byMeal.map(({ value, label, servings, people }) => (
              <Link
                key={value}
                href={hrefWith({ meal: mealFilter === value ? "" : value, page: 1 })}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition-colors ${
                  mealFilter === value
                    ? "border-brand/40 bg-brand-soft"
                    : "border-border bg-surface hover:border-brand/40"
                }`}
              >
                <span>{label}</span>
                <span className="font-mono text-xs tabular-nums text-muted">
                  <span className="font-bold text-brand">{people}</span> fed
                  {servings !== people && ` · ${servings} served`}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Filters ----------------------------------------------------------- */}
      <form method="get" className="mt-6 flex flex-wrap gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search name or email"
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand"
        />
        <select
          name="day"
          defaultValue={dayFilter}
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand"
        >
          <option value="">All days</option>
          {EVENT_DAYS.map(({ date, label }) => (
            <option key={date} value={date}>
              {label}
            </option>
          ))}
        </select>
        <select
          name="station"
          defaultValue={stationFilter}
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand"
        >
          <option value="">All stations</option>
          {STATION_FILTERS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          name="direction"
          defaultValue={directionFilter}
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand"
        >
          <option value="">In and out</option>
          <option value="in">In only</option>
          <option value="out">Out only</option>
        </select>
        <select
          name="meal"
          defaultValue={mealFilter}
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand"
        >
          <option value="">All sittings</option>
          {MEALS.map((value) => (
            <option key={value} value={value}>
              {MEAL_LABELS[value]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong"
        >
          Filter
        </button>
      </form>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        {filtersApplied && (
          <Link href="/admin/attendance" className="text-xs text-muted underline">
            Clear filters
          </Link>
        )}
        <a
          href={`/api/admin/attendance${dayFilter ? `?day=${dayFilter}` : ""}`}
          className="ml-auto inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-brand/40"
        >
          <Download size={15} aria-hidden />
          Export CSV
        </a>
      </div>

      {scans.length === MAX_ROWS && (
        <p className="mt-4 rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning">
          Showing the {MAX_ROWS} most recent scans for this filter. Narrow it by
          day to see the rest, or export the CSV for the full log.
        </p>
      )}

      {/* Log --------------------------------------------------------------- */}
      <p className="mt-6 text-sm text-muted">
        {scans.length} {scans.length === 1 ? "scan" : "scans"}
        {totalPages > 1 && ` · page ${currentPage} of ${totalPages}`}
      </p>

      {visible.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
          {filtersApplied
            ? "No scans match that filter."
            : "Nothing scanned yet. Rows appear here as the desk works through the queue."}
        </p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {visible.map((scan) => {
            const person = people.get(scan.profile_id);
            const scanner = scan.scanned_by ? people.get(scan.scanned_by) : null;
            const outbound = scan.direction === "out";

            return (
              <li
                key={scan.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    outbound ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                  }`}
                  aria-hidden
                >
                  {outbound ? (
                    <ArrowUpRight size={16} />
                  ) : (
                    <ArrowDownLeft size={16} />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold leading-tight">
                    {person?.full_name ?? "Deleted member"}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {[
                      person && ROLE_LABELS[person.role],
                      person?.team_name,
                      scanner && `by ${scanner.full_name}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>

                <span className="shrink-0 text-right">
                  <span className="block text-xs font-semibold">
                    {scan.meal && isMeal(scan.meal)
                      ? MEAL_LABELS[scan.meal]
                      : stationLabel(scan.station)}
                  </span>
                  <span className="block font-mono text-[11px] tabular-nums text-muted">
                    {formatScanTime(scan.created_at)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm">
          {currentPage > 1 ? (
            <Link
              href={pageHref(currentPage - 1)}
              className="rounded-xl border border-border bg-surface px-4 py-2 font-medium transition-colors hover:border-brand/40"
            >
              Previous
            </Link>
          ) : (
            <span />
          )}
          {currentPage < totalPages ? (
            <Link
              href={pageHref(currentPage + 1)}
              className="rounded-xl border border-border bg-surface px-4 py-2 font-medium transition-colors hover:border-brand/40"
            >
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}

      <div className="mt-8">
        <ManualCheckIn />
      </div>

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
