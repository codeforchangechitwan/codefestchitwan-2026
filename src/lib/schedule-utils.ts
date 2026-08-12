import type { ScheduleEvent } from "@/lib/types";

/** Groups events into the three event days, preserving order. */
export function groupByDay(events: ScheduleEvent[]) {
  const days = new Map<string, { label: string; events: ScheduleEvent[] }>();
  for (const event of events) {
    const entry = days.get(event.day) ?? { label: event.day_label, events: [] };
    entry.events.push(event);
    days.set(event.day, entry);
  }
  return [...days.entries()].map(([day, value]) => ({ day, ...value }));
}
