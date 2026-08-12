import { createClient } from "@/lib/supabase/server";
import { FALLBACK_SCHEDULE } from "@/lib/schedule-fallback";
import { SUPABASE_URL } from "@/lib/env";
import type { ScheduleEvent } from "@/lib/types";

/**
 * Reads the timeline from Supabase, falling back to the bundled copy when the
 * database is unreachable or not yet configured — the schedule is the one page
 * that must never be blank.
 */
export async function getSchedule(): Promise<{
  events: ScheduleEvent[];
  live: boolean;
}> {
  if (!SUPABASE_URL) return { events: FALLBACK_SCHEDULE, live: false };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("schedule_events")
      .select("*")
      .order("day", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) {
      return { events: FALLBACK_SCHEDULE, live: false };
    }
    return { events: data as ScheduleEvent[], live: true };
  } catch {
    return { events: FALLBACK_SCHEDULE, live: false };
  }
}

export { groupByDay } from "@/lib/schedule-utils";
