import type { ScheduleEvent } from "@/lib/types";

/*
 * Sessions the timeline highlights and the schedule page's "Key Highlights"
 * filter selects.
 *
 * Matched as prefixes rather than whole titles: the published timeline varies
 * the tail of these names ("Presentations Begin", "Presentations Continue",
 * "Closing Ceremony & Award Distribution"), and an exact-match set silently
 * drops the highlight the moment the organisers reword a row.
 */
const KEY_SESSION_PREFIXES = [
  "Registration Starts",
  "Opening Ceremony",
  "Quiz & Refreshments",
  "Presentations",
  "Closing Ceremony",
];

export function isKeySession(title: string) {
  return KEY_SESSION_PREFIXES.some((prefix) => title.startsWith(prefix));
}

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
