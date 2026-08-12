import { NextResponse } from "next/server";
import { requireExecutiveApi } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { csvBody, csvResponse, type CsvColumn } from "@/lib/csv";
import { formatScanTime, stationKey } from "@/lib/attendance";
import { ROLE_LABELS, type Profile } from "@/lib/types";

/**
 * The roster, one row per member, with each person's attendance folded in.
 *
 * The reference implementation this is modelled on wrote an .xlsx through the
 * `xlsx` package. This writes CSV instead: Excel opens it natively, it matches
 * the submissions export already in the app, and it keeps a dependency with a
 * long history of prototype-pollution advisories out of a build that handles
 * the attendee list.
 *
 * `qr_token` is deliberately absent. It is the entire content of a member's
 * identity card, and a spreadsheet passed around on a pen drive is exactly how
 * a card gets cloned.
 */

type ScanLite = {
  profile_id: string;
  station: string;
  direction: string;
  created_at: string;
};

type Attendance = {
  total: number;
  registration: number;
  canteen: number;
  exit: number;
  lastSeen: string | null;
  /** Where they last went through: tells the desk who is still on site. */
  lastDirection: string | null;
};

type ExportRow = { member: Profile; attendance: Attendance };

const EMPTY: Attendance = {
  total: 0,
  registration: 0,
  canteen: 0,
  exit: 0,
  lastSeen: null,
  lastDirection: null,
};

const COLUMNS: CsvColumn<ExportRow>[] = [
  { key: "full_name", get: ({ member }) => member.full_name },
  { key: "email", get: ({ member }) => member.email },
  { key: "role", get: ({ member }) => ROLE_LABELS[member.role] },
  { key: "team", get: ({ member }) => member.team_name },
  { key: "institution", get: ({ member }) => member.institution },
  { key: "phone", get: ({ member }) => member.phone },
  { key: "room", get: ({ member }) => member.room },
  { key: "checked_in", get: ({ member }) => member.checked_in_at !== null },
  {
    key: "first_check_in",
    get: ({ member }) =>
      member.checked_in_at ? formatScanTime(member.checked_in_at) : "",
  },
  { key: "total_scans", get: ({ attendance }) => attendance.total },
  { key: "registration_scans", get: ({ attendance }) => attendance.registration },
  { key: "canteen_scans", get: ({ attendance }) => attendance.canteen },
  { key: "exit_scans", get: ({ attendance }) => attendance.exit },
  {
    key: "last_seen",
    get: ({ attendance }) =>
      attendance.lastSeen ? formatScanTime(attendance.lastSeen) : "",
  },
  {
    key: "last_direction",
    get: ({ attendance }) =>
      attendance.lastDirection ? (attendance.lastDirection === "out" ? "Out" : "In") : "",
  },
  { key: "active", get: ({ member }) => member.is_active },
  { key: "password_still_temporary", get: ({ member }) => member.must_change_password },
  { key: "account_created", get: ({ member }) => member.created_at },
];

export async function GET() {
  const { response } = await requireExecutiveApi();
  if (response) return response;

  const supabase = await createClient();

  const [{ data: profileRows, error }, { data: scanRows }] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name"),
    supabase
      .from("check_ins")
      .select("profile_id, station, direction, created_at")
      .order("created_at", { ascending: true }),
  ]);

  if (error) {
    return new NextResponse(`Could not read the roster: ${error.message}`, {
      status: 500,
    });
  }

  // Rows arrive oldest first, so the last one seen for a member is the latest.
  const attendance = new Map<string, Attendance>();
  for (const scan of (scanRows ?? []) as ScanLite[]) {
    const entry = attendance.get(scan.profile_id) ?? { ...EMPTY };
    entry.total += 1;

    const key = stationKey(scan.station);
    if (key === "registration") entry.registration += 1;
    else if (key === "canteen") entry.canteen += 1;
    else if (key === "exit") entry.exit += 1;

    entry.lastSeen = scan.created_at;
    entry.lastDirection = scan.direction;
    attendance.set(scan.profile_id, entry);
  }

  const rows: ExportRow[] = ((profileRows ?? []) as Profile[]).map((member) => ({
    member,
    attendance: attendance.get(member.id) ?? EMPTY,
  }));

  return csvResponse("codefest-2026-members.csv", csvBody(COLUMNS, rows));
}
