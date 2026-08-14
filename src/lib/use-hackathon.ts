"use client";

import { createClient } from "@/lib/supabase/client";
import { useLiveQuery } from "@/lib/use-live-query";
import { hackathonFromRow, type HackathonState } from "@/lib/hackathon";

/**
 * Reads the clock straight from Supabase, never back through the Next server.
 * A building full of devices watching a 36-hour countdown costs the VPS
 * nothing — the same bargain the pitch timer and the ribbon already take.
 */
export async function readHackathon(): Promise<HackathonState> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("hackathon_state");
  const row = Array.isArray(data) ? data[0] : null;
  if (error || !row) throw error ?? new Error("no hackathon row");

  // Skew measured at the moment the response lands, exactly as the pitch timer
  // does it: a handset with a wrong clock still shows the right number.
  return hackathonFromRow(row, Date.parse(row.server_now) - Date.now());
}

/**
 * Live for as long as the tab is open: an `event` pulse fires the instant the
 * coordinator presses start, and the heartbeat covers a missed message.
 */
export function useHackathon(initial: HackathonState) {
  return useLiveQuery({
    topics: ["event"],
    initial,
    fetcher: readHackathon,
  });
}
