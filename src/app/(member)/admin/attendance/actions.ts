"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireExecutive } from "@/lib/auth";
import { stationLabel } from "@/lib/attendance";
import {
  isScanDirection,
  isStation,
  type Role,
  type ScanDirection,
  type Station,
} from "@/lib/types";

export type MemberMatch = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  team_name: string | null;
  checked_in_at: string | null;
  is_active: boolean;
};

/**
 * Name/email lookup for the manual check-in panel.
 *
 * Executives only, and not because manual check-in is dangerous: reading the
 * profiles table at all requires `is_executive()` under RLS, so a volunteer
 * calling this would get an empty list rather than a useful error. Volunteers
 * check people in with the camera at /admin/scan, which goes through
 * `record_scan` and never reads profiles directly.
 */
export async function searchMembers(query: string): Promise<MemberMatch[]> {
  await requireExecutive();

  const term = query.trim();
  if (term.length < 2) return [];

  // PostgREST `or` takes a comma-separated filter list, so a comma or a
  // parenthesis in the search box would otherwise be read as syntax.
  const escaped = term.replace(/[(),*]/g, " ").trim();
  if (!escaped) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, team_name, checked_in_at, is_active")
    .or(`full_name.ilike.%${escaped}%,email.ilike.%${escaped}%`)
    .order("full_name")
    .limit(12);

  return (data ?? []) as MemberMatch[];
}

export type ManualScanResult =
  | { ok: true; message: string; firstTime: boolean }
  | { ok: false; message: string };

/**
 * Records a scan for someone whose card cannot be read — lost lanyard, dead
 * phone, cracked screen, camera refusing to focus in the morning glare.
 *
 * Deliberately goes through the same `record_scan` RPC as the camera rather
 * than inserting into check_ins directly, so a manual entry is stamped,
 * counted and normalised identically and the two paths cannot drift. The token
 * is read server-side and never sent to the browser: it is the whole content
 * of the member's identity card.
 */
export async function manualScan(
  profileId: string,
  station: Station,
  direction: ScanDirection,
): Promise<ManualScanResult> {
  await requireExecutive();

  if (!isStation(station) || !isScanDirection(direction)) {
    return { ok: false, message: "Pick a station and a direction." };
  }

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("qr_token, full_name")
    .eq("id", profileId)
    .single();

  if (!profile) {
    return { ok: false, message: "That member no longer exists." };
  }

  const { data, error } = await supabase.rpc("record_scan", {
    token: profile.qr_token as string,
    station,
    direction,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) {
    return { ok: false, message: "The scan was not recorded — try again." };
  }

  revalidatePath("/admin/attendance");
  revalidatePath("/admin");

  const where = `${stationLabel(row.station_recorded)} · ${
    row.direction_recorded === "out" ? "Out" : "In"
  }`;

  return {
    ok: true,
    firstTime: row.first_time,
    message: row.first_time
      ? `${row.full_name} checked in for the first time (${where}).`
      : `${row.full_name} recorded at ${where}.`,
  };
}
