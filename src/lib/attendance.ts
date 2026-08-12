/**
 * Helpers for reading the check-in log.
 *
 * `record_scan()` writes a row per card presented; everything here is about
 * getting those rows back out in the shape the desk supervisor asks for
 * ("who is still inside?", "how many ate lunch?").
 */

export const KATHMANDU = "Asia/Kathmandu";

/** The three event days, as they fall on the Kathmandu calendar. */
export const EVENT_DAYS = [
  { date: "2026-08-14", label: "Fri 14 Aug · Day 1" },
  { date: "2026-08-15", label: "Sat 15 Aug · Day 2" },
  { date: "2026-08-16", label: "Sun 16 Aug · Day 3" },
] as const;

/**
 * Half-open [start, end) covering one Kathmandu calendar day, as UTC instants.
 *
 * Nepal is UTC+05:45 and has never observed daylight saving, so the offset is
 * written into the literal rather than derived — a Kathmandu day begins at
 * 18:15Z on the previous date. `record_scan` truncates the same way when it
 * counts a card's prior scans, so the two agree on where a day ends.
 */
export function kathmanduDayRange(date: string) {
  const start = new Date(`${date}T00:00:00+05:45`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

/**
 * Display name for a `check_ins.station` value.
 *
 * The column is free text on purpose (see the multi-station migration), so
 * this has to cope with three vintages of value: what `record_scan` normalises
 * to today, the `registration-desk` rows written by `check_in_by_token` before
 * stations existed, and the `other` bucket anything unrecognised falls into.
 */
export function stationLabel(raw: string) {
  switch (raw) {
    case "registration":
    case "registration-desk":
      return "Registration";
    case "exit":
      return "Exit";
    case "canteen":
      return "Canteen";
    default:
      return "Other";
  }
}

/** Groups the legacy spelling in with the station it means. */
export function stationKey(raw: string) {
  if (raw === "registration-desk") return "registration";
  if (raw === "exit" || raw === "canteen" || raw === "registration") return raw;
  return "other";
}

export const STATION_FILTERS = [
  { value: "registration", label: "Registration" },
  { value: "exit", label: "Exit" },
  { value: "canteen", label: "Canteen" },
  { value: "other", label: "Other" },
] as const;

const TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: KATHMANDU,
});

export function formatScanTime(iso: string) {
  return TIME_FORMAT.format(new Date(iso));
}
