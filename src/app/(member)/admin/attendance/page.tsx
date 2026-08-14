import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  ScanLine,
  Users,
} from "lucide-react";
import { requireExecutive } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  EVENT_DAYS,
  formatScanTime,
  kathmanduDayRange,
  STATION_FILTERS,
  stationLabel,
} from "@/lib/attendance";
import {
  MEAL_LABELS,
  MEALS,
  ROLES,
  ROLE_LABELS,
  isMeal,
  type Role,
} from "@/lib/types";
import { ManualCheckIn } from "./manual-check-in";

export const metadata: Metadata = { title: "Attendance" };

/**
 * The desk supervisor's view of the day.
 *
 * Two questions, two tabs: "what just happened" (the scan log) and "who is in
 * the building" (the roll). Both are answered by one RPC each — the filtering,
 * counting, joining and paging all happen in Postgres. The page used to pull
 * 2000 rows and count them in Node on every load, which got slower with every
 * scan of the day and was by far the heaviest thing running on the VPS.
 */

const PAGE_SIZE = 50;

type View = "log" | "people";

type Summary = {
  scans: number;
  people: number;
  arrivals: number;
  departures: number;
  inside_now: number;
  by_station: Record<string, number>;
  by_meal: Record<string, { servings: number; people: number }>;
  by_role: Record<string, number>;
};

type FeedRow = {
  id: string;
  created_at: string;
  station: string;
  direction: string;
  meal: string | null;
  profile_id: string;
  full_name: string;
  role: Role;
  team_name: string | null;
  scanned_by_name: string | null;
  total_count: number;
};

type RollRow = {
  profile_id: string;
  full_name: string;
  role: Role;
  team_name: string | null;
  inside: boolean;
  last_station: string | null;
  last_direction: string | null;
  last_seen: string | null;
  scans: number;
  meals: number;
  first_in: string | null;
  last_out: string | null;
  total_count: number;
};

export default async function AttendancePage(
  props: PageProps<"/admin/attendance">,
) {
  await requireExecutive();
  const params = await props.searchParams;

  const single = (value: string | string[] | undefined) =>
    typeof value === "string" ? value : "";

  const view: View = single(params.view) === "people" ? "people" : "log";
  const dayFilter = single(params.day);
  const stationFilter = single(params.station);
  const directionFilter = single(params.direction);
  const mealFilter = isMeal(single(params.meal)) ? single(params.meal) : "";
  const roleFilter = (ROLES as readonly string[]).includes(single(params.role))
    ? single(params.role)
    : "";
  const presenceFilter = ["inside", "outside", "never"].includes(
    single(params.presence),
  )
    ? single(params.presence)
    : "";
  const query = single(params.q).trim();

  const rawPage = Number.parseInt(single(params.page), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const offset = (page - 1) * PAGE_SIZE;

  const range = dayFilter ? kathmanduDayRange(dayFilter) : null;
  const supabase = await createClient();

  const [summaryResult, rowsResult] = await Promise.all([
    supabase.rpc("attendance_summary", {
      p_from: range?.start ?? null,
      p_to: range?.end ?? null,
      p_station: stationFilter || null,
      p_direction: directionFilter || null,
      p_meal: mealFilter || null,
      p_query: query || null,
    }),
    view === "people"
      ? supabase.rpc("attendance_roll", {
          p_from: range?.start ?? null,
          p_to: range?.end ?? null,
          p_role: roleFilter || null,
          p_query: query || null,
          p_presence: presenceFilter || null,
          p_limit: PAGE_SIZE,
          p_offset: offset,
        })
      : supabase.rpc("attendance_feed", {
          p_from: range?.start ?? null,
          p_to: range?.end ?? null,
          p_station: stationFilter || null,
          p_direction: directionFilter || null,
          p_meal: mealFilter || null,
          p_query: query || null,
          p_role: roleFilter || null,
          p_limit: PAGE_SIZE,
          p_offset: offset,
        }),
  ]);

  const summary = ((Array.isArray(summaryResult.data)
    ? summaryResult.data[0]
    : null) ?? {
    scans: 0,
    people: 0,
    arrivals: 0,
    departures: 0,
    inside_now: 0,
    by_station: {},
    by_meal: {},
    by_role: {},
  }) as Summary;

  const error = summaryResult.error ?? rowsResult.error;

  const feedRows = (view === "log" ? (rowsResult.data ?? []) : []) as FeedRow[];
  const rollRows = (view === "people" ? (rowsResult.data ?? []) : []) as RollRow[];

  // total_count rides along on every row — one window function, no second
  // count query.
  const totalRows =
    view === "people"
      ? (rollRows[0]?.total_count ?? 0)
      : (feedRows[0]?.total_count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  const filtersApplied = Boolean(
    dayFilter ||
      stationFilter ||
      directionFilter ||
      mealFilter ||
      roleFilter ||
      presenceFilter ||
      query,
  );

  function hrefWith(overrides: Record<string, string | number>) {
    const current: Record<string, string> = {
      view: view === "people" ? "people" : "",
      day: dayFilter,
      station: stationFilter,
      direction: directionFilter,
      meal: mealFilter,
      role: roleFilter,
      presence: presenceFilter,
      q: query,
      page: page > 1 ? String(page) : "",
      ...Object.fromEntries(
        Object.entries(overrides).map(([key, value]) => [key, String(value)]),
      ),
    };

    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(current)) {
      if (!value) continue;
      if (key === "page" && value === "1") continue;
      search.set(key, value);
    }

    const suffix = search.toString();
    return suffix ? `/admin/attendance?${suffix}` : "/admin/attendance";
  }

  const mealEntries = MEALS.map((value) => ({
    value,
    label: MEAL_LABELS[value],
    ...(summary.by_meal?.[value] ?? { servings: 0, people: 0 }),
  })).filter((entry) => entry.servings > 0);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
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

      {/* Tabs -------------------------------------------------------------- */}
      <nav className="mt-6 flex gap-2 text-sm">
        <Link
          href={hrefWith({ view: "", page: 1 })}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-semibold transition-colors ${
            view === "log"
              ? "bg-brand text-white"
              : "border border-border bg-surface text-muted hover:border-brand/40"
          }`}
        >
          <ScanLine size={15} aria-hidden />
          Scan log
        </Link>
        <Link
          href={hrefWith({ view: "people", page: 1 })}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-semibold transition-colors ${
            view === "people"
              ? "bg-brand text-white"
              : "border border-border bg-surface text-muted hover:border-brand/40"
          }`}
        >
          <Users size={15} aria-hidden />
          Who&rsquo;s in
        </Link>
      </nav>

      {/* Stats ------------------------------------------------------------- */}
      <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Inside now" value={summary.inside_now} accent />
        <Stat label="Scans" value={summary.scans} />
        <Stat label="People" value={summary.people} />
        <Stat label="In" value={summary.arrivals} />
        <Stat label="Out" value={summary.departures} />
      </section>

      <section className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {STATION_FILTERS.map(({ value, label }) => {
          const count = summary.by_station?.[value] ?? 0;
          if (count === 0 && value === "other") return null;
          return (
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
          );
        })}
      </section>

      {mealEntries.length > 0 && (
        <section className="mt-3">
          <h2 className="text-[11px] font-bold uppercase tracking-wide text-muted">
            Sittings — servings, and how many people they fed
          </h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {mealEntries.map(({ value, label, servings, people }) => (
              <Link
                key={value}
                href={hrefWith({
                  meal: mealFilter === value ? "" : value,
                  page: 1,
                })}
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
      <form method="get" className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {view === "people" && <input type="hidden" name="view" value="people" />}

        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search name or email"
          className="min-w-0 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand sm:col-span-2"
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
          name="role"
          defaultValue={roleFilter}
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand"
        >
          <option value="">All categories</option>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
              {summary.by_role?.[role] ? ` (${summary.by_role[role]})` : ""}
            </option>
          ))}
        </select>

        {view === "people" ? (
          <select
            name="presence"
            defaultValue={presenceFilter}
            className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand"
          >
            <option value="">Everyone</option>
            <option value="inside">Inside now</option>
            <option value="outside">Left the venue</option>
            <option value="never">Never scanned</option>
          </select>
        ) : (
          <>
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
          </>
        )}

        <button
          type="submit"
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong"
        >
          Filter
        </button>
      </form>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        {filtersApplied && (
          <Link
            href={view === "people" ? "/admin/attendance?view=people" : "/admin/attendance"}
            className="text-xs text-muted underline"
          >
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

      <p className="mt-6 text-sm text-muted">
        {totalRows} {view === "people" ? "people" : "scans"}
        {totalPages > 1 && ` · page ${page} of ${totalPages}`}
      </p>

      {/* Rows -------------------------------------------------------------- */}
      {view === "people" ? (
        <RollList rows={rollRows} filtersApplied={filtersApplied} />
      ) : (
        <FeedList rows={feedRows} filtersApplied={filtersApplied} />
      )}

      {totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={hrefWith({ page: page - 1 })}
              className="rounded-xl border border-border bg-surface px-4 py-2 font-medium transition-colors hover:border-brand/40"
            >
              Previous
            </Link>
          ) : (
            <span />
          )}
          {page < totalPages ? (
            <Link
              href={hrefWith({ page: page + 1 })}
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

function FeedList({
  rows,
  filtersApplied,
}: {
  rows: FeedRow[];
  filtersApplied: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="mt-3 rounded-2xl border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
        {filtersApplied
          ? "No scans match that filter."
          : "Nothing scanned yet. Rows appear here as the desk works through the queue."}
      </p>
    );
  }

  return (
    <ul className="mt-3 grid gap-2">
      {rows.map((scan) => {
        const outbound = scan.direction === "out";
        return (
          <li
            key={scan.id}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4"
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                outbound
                  ? "bg-warning/10 text-warning"
                  : "bg-success/10 text-success"
              }`}
              aria-hidden
            >
              {outbound ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold leading-tight">
                {scan.full_name ?? "Deleted member"}
              </span>
              <span className="block truncate text-xs text-muted">
                {[
                  ROLE_LABELS[scan.role],
                  scan.team_name,
                  scan.scanned_by_name && `by ${scan.scanned_by_name}`,
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
  );
}

/**
 * The roll. One row per person rather than per scan, so "is that mentor still
 * here?" is a glance instead of a search through the log.
 */
function RollList({
  rows,
  filtersApplied,
}: {
  rows: RollRow[];
  filtersApplied: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="mt-3 rounded-2xl border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
        {filtersApplied
          ? "Nobody matches that filter."
          : "No members yet."}
      </p>
    );
  }

  return (
    <ul className="mt-3 grid gap-2">
      {rows.map((person) => (
        <li
          key={person.profile_id}
          className={`flex items-center gap-3 rounded-2xl border p-4 ${
            person.inside
              ? "border-success/30 bg-success/5"
              : "border-border bg-surface"
          }`}
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold uppercase ${
              person.inside
                ? "bg-success/10 text-success"
                : person.last_seen
                  ? "bg-warning/10 text-warning"
                  : "bg-surface-muted text-muted"
            }`}
            aria-hidden
          >
            {person.inside ? "In" : person.last_seen ? "Out" : "—"}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold leading-tight">
              {person.full_name}
            </span>
            <span className="block truncate text-xs text-muted">
              {[ROLE_LABELS[person.role], person.team_name]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </span>

          <span className="shrink-0 text-right">
            <span className="block text-xs font-semibold">
              {person.last_seen
                ? formatScanTime(person.last_seen)
                : "Never scanned"}
            </span>
            <span className="block font-mono text-[11px] tabular-nums text-muted">
              {person.scans} scan{person.scans === 1 ? "" : "s"}
              {person.meals > 0 && ` · ${person.meals} meal${person.meals === 1 ? "" : "s"}`}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 text-center ${
        accent ? "border-success/30 bg-success/5" : "border-border bg-surface"
      }`}
    >
      <p
        className={`font-mono text-2xl font-extrabold tabular-nums ${
          accent ? "text-success" : "text-brand"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted">
        {label}
      </p>
    </div>
  );
}
