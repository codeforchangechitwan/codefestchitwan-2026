"use server";

import { createClient } from "@/lib/supabase/server";
import { requireExecutive } from "@/lib/auth";

export type PitchAction = "start" | "next" | "pause" | "resume" | "extend" | "stop";

/**
 * Drives the stage clock.
 *
 * Every instant is computed by set_pitch() from the database clock, never from
 * the executive's laptop — a browser running 40s fast must not shorten
 * somebody's pitch.
 */
export async function setPitch(
  action: PitchAction,
  targetTeam: string | null = null,
  seconds: number | null = null,
): Promise<{ ok: boolean; message: string }> {
  await requireExecutive();

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_pitch", {
    action,
    target_team: targetTeam,
    seconds,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Done." };
}
