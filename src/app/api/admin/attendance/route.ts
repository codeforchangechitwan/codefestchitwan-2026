import { NextResponse } from "next/server";
import { requireExecutiveApi } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { csvBody, csvResponse, type CsvColumn } from "@/lib/csv";
import { formatScanTime, kathmanduDayRange, stationLabel } from "@/lib/attendance";
import { MEAL_LABELS, ROLE_LABELS, isMeal, type Role } from "@/lib/types";

/**
 * The full check-in log as CSV, for the attendance register the college asks
 * for after the event.
 *
 * Unlike the page, this is not capped: the whole point of the export is to be
 * the complete record.
 */

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
  email: string;
  role: Role;
  team_name: string | null;
  institution: string | null;
};

type ExportRow = {
  scan: ScanRow;
  person: ProfileLite | undefined;
  scanner: ProfileLite | undefined;
};

const COLUMNS: CsvColumn<ExportRow>[] = [
  { key: "scanned_at", get: ({ scan }) => scan.created_at },
  { key: "scanned_at_local", get: ({ scan }) => formatScanTime(scan.created_at) },
  { key: "full_name", get: ({ person }) => person?.full_name },
  { key: "email", get: ({ person }) => person?.email },
  { key: "role", get: ({ person }) => (person ? ROLE_LABELS[person.role] : "") },
  { key: "team", get: ({ person }) => person?.team_name },
  { key: "institution", get: ({ person }) => person?.institution },
  { key: "station", get: ({ scan }) => stationLabel(scan.station) },
  { key: "direction", get: ({ scan }) => (scan.direction === "out" ? "Out" : "In") },
  { key: "meal", get: ({ scan }) => (isMeal(scan.meal) ? MEAL_LABELS[scan.meal] : "") },
  { key: "scanned_by", get: ({ scanner }) => scanner?.full_name },
];

export async function GET(request: Request) {
  const { response } = await requireExecutiveApi();
  if (response) return response;

  const day = new URL(request.url).searchParams.get("day");
  const supabase = await createClient();

  let query = supabase
    .from("check_ins")
    .select("id, created_at, station, direction, meal, profile_id, scanned_by")
    .order("created_at", { ascending: false });

  const range = day ? kathmanduDayRange(day) : null;
  if (range) {
    query = query.gte("created_at", range.start).lt("created_at", range.end);
  }

  const { data, error } = await query;
  if (error) {
    return new NextResponse(`Could not read the scan log: ${error.message}`, {
      status: 500,
    });
  }

  const scans = (data ?? []) as ScanRow[];

  const peopleIds = [
    ...new Set(
      scans.flatMap((scan) =>
        scan.scanned_by ? [scan.profile_id, scan.scanned_by] : [scan.profile_id],
      ),
    ),
  ];

  const people = new Map<string, ProfileLite>();
  if (peopleIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, team_name, institution")
      .in("id", peopleIds);
    for (const row of (profiles ?? []) as ProfileLite[]) people.set(row.id, row);
  }

  const rows: ExportRow[] = scans.map((scan) => ({
    scan,
    person: people.get(scan.profile_id),
    scanner: scan.scanned_by ? people.get(scan.scanned_by) : undefined,
  }));

  const suffix = day ? `-${day}` : "";
  return csvResponse(
    `codefest-2026-attendance${suffix}.csv`,
    csvBody(COLUMNS, rows),
  );
}
