import type { ScheduleEvent } from "@/lib/types";

/*
 * The same timeline as supabase/migrations/*_seed_schedule.sql.
 *
 * Kept in the bundle so the public schedule page still renders during a
 * database outage, on venue wifi, and before Supabase is configured. The
 * database is the source of truth whenever it answers.
 */

type Seed = Pick<
  ScheduleEvent,
  "day" | "day_label" | "time_label" | "title" | "zone"
>;

const SEED: Seed[] = [
  // Friday, 14 August
  { day: "2026-08-14", day_label: "Friday, 14 August", time_label: "7:00 AM", title: "Registration Starts", zone: "Registration desk" },
  { day: "2026-08-14", day_label: "Friday, 14 August", time_label: "8:00–8:20 AM", title: "Settling In", zone: "Allocated Room" },
  { day: "2026-08-14", day_label: "Friday, 14 August", time_label: "8:20–9:20 AM", title: "Opening Ceremony", zone: "Main Hall" },
  { day: "2026-08-14", day_label: "Friday, 14 August", time_label: "9:20–10:00 AM", title: "Orientation", zone: "Main Hall" },
  { day: "2026-08-14", day_label: "Friday, 14 August", time_label: "10:30–11:00 AM", title: "Lunch", zone: "Cafeteria — Building B" },
  { day: "2026-08-14", day_label: "Friday, 14 August", time_label: "11:00 AM–6:00 PM", title: "Coding Session", zone: "Allocated Room" },
  { day: "2026-08-14", day_label: "Friday, 14 August", time_label: "6:00–7:30 PM", title: "Dinner / Refreshment", zone: "Cafeteria — Building B" },
  { day: "2026-08-14", day_label: "Friday, 14 August", time_label: "7:30–8:30 PM", title: "Mentor Online Session", zone: "Allocated Room" },
  { day: "2026-08-14", day_label: "Friday, 14 August", time_label: "8:30 PM–7:00 AM", title: "Night Coding", zone: "Allocated Room" },

  // Saturday, 15 August
  { day: "2026-08-15", day_label: "Saturday, 15 August", time_label: "7:00–8:00 AM", title: "Breakfast", zone: "Cafeteria — Building B" },
  { day: "2026-08-15", day_label: "Saturday, 15 August", time_label: "8:00–11:00 AM", title: "Coding Session", zone: "Allocated Room" },
  { day: "2026-08-15", day_label: "Saturday, 15 August", time_label: "11:00 AM–12:00 PM", title: "Lunch", zone: "Cafeteria — Building B" },
  { day: "2026-08-15", day_label: "Saturday, 15 August", time_label: "12:00–1:00 PM", title: "Mentor Online Session", zone: "Allocated Room" },
  { day: "2026-08-15", day_label: "Saturday, 15 August", time_label: "1:00–3:00 PM", title: "Coding Session", zone: "Allocated Room" },
  { day: "2026-08-15", day_label: "Saturday, 15 August", time_label: "3:00–4:00 PM", title: "Snacks & Refreshments", zone: "Cafeteria — Building B" },
  { day: "2026-08-15", day_label: "Saturday, 15 August", time_label: "4:00–6:00 PM", title: "Coding Session", zone: "Allocated Room" },
  { day: "2026-08-15", day_label: "Saturday, 15 August", time_label: "6:00–7:00 PM", title: "Dinner", zone: "Cafeteria — Building B" },
  { day: "2026-08-15", day_label: "Saturday, 15 August", time_label: "7:00–7:40 PM", title: "Quiz & Refreshments", zone: "Allocated Room" },
  { day: "2026-08-15", day_label: "Saturday, 15 August", time_label: "7:40 PM onwards", title: "Coding Night", zone: "Allocated Room" },

  // Sunday, 16 August
  { day: "2026-08-16", day_label: "Sunday, 16 August", time_label: "Until 9:00 AM", title: "Coffee, Final Coding & PPT Preparation", zone: "Allocated Room" },
  { day: "2026-08-16", day_label: "Sunday, 16 August", time_label: "9:00–9:20 AM", title: "Judges' Arrival, Briefing & Seating", zone: "Main Hall" },
  { day: "2026-08-16", day_label: "Sunday, 16 August", time_label: "9:20–10:30 AM", title: "Presentations Begin", zone: "Main Hall" },
  { day: "2026-08-16", day_label: "Sunday, 16 August", time_label: "10:30–11:30 AM", title: "Lunch", zone: "Cafeteria — Building B" },
  { day: "2026-08-16", day_label: "Sunday, 16 August", time_label: "11:30 AM–2:45 PM", title: "Presentations Continue", zone: "Main Hall" },
  { day: "2026-08-16", day_label: "Sunday, 16 August", time_label: "2:45–3:00 PM", title: "Judges' Deliberation & Buffer Time", zone: "Main Hall" },
  { day: "2026-08-16", day_label: "Sunday, 16 August", time_label: "3:00–5:00 PM", title: "Closing Ceremony & Award Distribution", zone: "Main Hall" },
];

export const FALLBACK_SCHEDULE: ScheduleEvent[] = SEED.map((item, index) => ({
  ...item,
  id: `fallback-${index}`,
  starts_at: null,
  ends_at: null,
  description: null,
  sort_order: index,
  visible_to: null,
}));
