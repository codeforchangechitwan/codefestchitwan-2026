"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireDeskStaff } from "@/lib/auth";

export type CheckInResult = {
  ok: boolean;
  message: string;
  fullName?: string;
  firstTime?: boolean;
};

/** Records a scan. The database function re-checks that the caller is staff. */
export async function checkIn(
  token: string,
  station = "registration-desk",
): Promise<CheckInResult> {
  await requireDeskStaff();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_in_by_token", {
    token,
    station,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) {
    return { ok: false, message: "Card not found." };
  }

  revalidatePath(`/verify/${token}`);

  return {
    ok: true,
    fullName: row.full_name,
    firstTime: row.first_time,
    message: row.first_time
      ? `${row.full_name} checked in.`
      : `${row.full_name} was already checked in — scan recorded.`,
  };
}
