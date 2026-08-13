"use server";

import { createClient } from "@/lib/supabase/server";
import { requireDeskStaff } from "@/lib/auth";
import { parseQrPayload } from "@/lib/qr";
import type { Meal, Role, ScanDirection, Station } from "@/lib/types";

export type ScanLookup =
  | {
      ok: true;
      token: string;
      fullName: string;
      role: Role;
      teamName: string | null;
      institution: string | null;
      room: string | null;
      isActive: boolean;
      checkedInAt: string | null;
    }
  | { ok: false; message: string };

export type ScanRecord =
  | {
      ok: true;
      token: string;
      fullName: string;
      role: Role;
      teamName: string | null;
      room: string | null;
      isActive: boolean;
      firstTime: boolean;
      /** Echoed back by the database, never the client's toggle. */
      station: string;
      direction: string;
      /** Null unless the scan was a canteen sitting. */
      meal: string | null;
      /** Times this card was already presented for this meal today, before now. */
      mealRepeat: number;
      scannedAt: string;
      scanCount: number;
      previousDirection: string | null;
    }
  | { ok: false; message: string };

/**
 * Resolves a card AND logs the scan in one round trip.
 *
 * Nothing is enforced here: a deactivated card is recorded and flagged rather
 * than refused, because the desk supervisor needs the record that it was
 * presented. Collapsing lookup + confirm into a single call is what keeps the
 * 07:00 queue moving.
 */
export async function recordScan(
  payload: string,
  station: Station,
  direction: ScanDirection,
  meal?: Meal,
): Promise<ScanRecord> {
  await requireDeskStaff();

  const token = parseQrPayload(payload);
  if (!token) {
    return { ok: false, message: "That doesn't look like a Codefest card." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_scan", {
    token,
    station,
    direction,
    // Sent always; record_scan discards it unless the station is the canteen,
    // so the rule lives in one place rather than in every caller.
    meal: meal ?? null,
  });
  const row = Array.isArray(data) ? data[0] : null;

  if (error) {
    return { ok: false, message: error.message };
  }
  if (!row) {
    return { ok: false, message: "Card not recognised. Look them up by name instead." };
  }

  return {
    ok: true,
    token,
    fullName: row.full_name,
    role: row.role,
    teamName: row.team_name,
    room: row.room,
    isActive: row.is_active,
    firstTime: row.first_time,
    station: row.station_recorded,
    direction: row.direction_recorded,
    meal: row.meal_recorded ?? null,
    mealRepeat: row.meal_repeat ?? 0,
    scannedAt: row.scanned_at,
    scanCount: row.scan_count,
    previousDirection: row.previous_direction,
  };
}

/**
 * Resolves a scanned QR payload without logging anything.
 *
 * Kept for the /verify/[token] phone-camera path and so reverting the scanner
 * is a single-file change. The scanner itself now uses recordScan().
 */
export async function lookupCard(payload: string): Promise<ScanLookup> {
  await requireDeskStaff();

  const token = parseQrPayload(payload);
  if (!token) {
    return { ok: false, message: "That doesn't look like a Codefest card." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_qr_token", { token });
  const row = Array.isArray(data) ? data[0] : null;

  if (error || !row) {
    return { ok: false, message: "Card not recognised. Look them up by name instead." };
  }

  return {
    ok: true,
    token,
    fullName: row.full_name,
    role: row.role,
    teamName: row.team_name,
    institution: row.institution,
    room: row.room,
    isActive: row.is_active,
    checkedInAt: row.checked_in_at,
  };
}
