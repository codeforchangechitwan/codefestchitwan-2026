"use client";

import { useNowSeconds } from "@/lib/use-now";

/**
 * The 36-hour digits.
 *
 * Same discipline as PitchClock: recompute `endsAt - now` every tick instead of
 * decrementing a counter. Over a day and a half of wall time a decrementing
 * clock would drift badly — phones sleep in pockets, tabs get throttled to once
 * a minute overnight, laptops suspend and resume. Reading the difference from
 * an absolute instant means a device that missed six hours still wakes up
 * showing the correct number.
 *
 * Hours are not wrapped at 24. "35:59:04" is the number a team wants; "1 day
 * 11:59:04" makes them do arithmetic, and a bare "11:59:04" would be a lie.
 */
export function HackClock({
  endsAt,
  skewMs = 0,
  className = "",
}: {
  endsAt: string | null;
  skewMs?: number;
  className?: string;
}) {
  const nowSeconds = useNowSeconds();

  const remaining =
    endsAt !== null && nowSeconds !== null
      ? Math.round((Date.parse(endsAt) - (nowSeconds * 1000 + skewMs)) / 1000)
      : null;

  // Fixed-width placeholder: the server snapshot is null by design, and this
  // keeps the layout from jumping when the first tick lands.
  if (remaining === null) {
    return (
      <span className={`font-mono tabular-nums ${className}`} aria-hidden>
        --:--:--
      </span>
    );
  }

  const done = remaining <= 0;
  const abs = Math.abs(remaining);
  const hours = Math.floor(abs / 3600);
  const minutes = Math.floor((abs % 3600) / 60);
  const seconds = abs % 60;

  const text = done
    ? "00:00:00"
    : `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(
        seconds,
      ).padStart(2, "0")}`;

  return (
    <span
      role="timer"
      // Off, not polite: a screen reader announcing every second for 36 hours
      // would make the page unusable for anyone relying on one.
      aria-live="off"
      aria-label={
        done ? "Time is up" : `${hours} hours ${minutes} minutes remaining`
      }
      className={`font-mono tabular-nums ${
        done ? "text-danger" : remaining <= 1800 ? "text-warning" : ""
      } ${className}`}
    >
      {text}
    </span>
  );
}
