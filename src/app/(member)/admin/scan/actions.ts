"use server";

import { createClient } from "@/lib/supabase/server";
import { requireDeskStaff } from "@/lib/auth";
import { parseQrPayload } from "@/lib/qr";
import type { Role } from "@/lib/types";

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

/** Resolves a scanned QR payload to a member, without checking them in yet. */
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
