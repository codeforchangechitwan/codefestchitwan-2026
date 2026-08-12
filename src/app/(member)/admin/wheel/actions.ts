"use server";

import { createClient } from "@/lib/supabase/server";
import { requireExecutive } from "@/lib/auth";

export type DrawMode = "tables" | "pitch";

export type DrawResult =
  | {
      ok: true;
      teamId: string;
      teamCode: string;
      teamName: string;
      slot: number;
      leftToDraw: number;
    }
  | { ok: false; message: string };

/**
 * Draws the next team.
 *
 * The winner is picked and committed by Postgres before this returns — the
 * spin in the browser is decoration over a decided result. Deliberately no
 * revalidatePath: a server re-render mid-animation would remount the reel and
 * lose the spin. The client appends the winner to its own list instead.
 */
export async function drawNext(mode: DrawMode): Promise<DrawResult> {
  await requireExecutive();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("draw_next", { mode });
  const row = Array.isArray(data) ? data[0] : null;

  if (error) return { ok: false, message: error.message };
  if (!row) return { ok: false, message: "Nothing left to draw." };

  return {
    ok: true,
    teamId: row.team_id,
    teamCode: row.team_code,
    teamName: row.team_name,
    slot: row.slot,
    leftToDraw: row.left_to_draw,
  };
}

export async function resetDraw(
  mode: DrawMode,
): Promise<{ ok: boolean; message: string }> {
  await requireExecutive();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reset_draw", { mode });

  if (error) return { ok: false, message: error.message };
  return {
    ok: true,
    message: `Cleared ${data ?? 0} ${mode === "pitch" ? "pitch slots" : "table numbers"}.`,
  };
}
