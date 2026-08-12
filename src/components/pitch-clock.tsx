"use client";

import { useNowSeconds } from "@/lib/use-now";

/**
 * The digits.
 *
 * Recomputes `endsAt - now` every tick rather than decrementing, so a throttled
 * background tab or a suspended phone snaps back to the right number instead of
 * accumulating drift — the same reasoning as the quiz timer.
 *
 * Overtime counts UP in red rather than blanking at zero: a chair needs to see
 * how far over a team has run.
 */
export function PitchClock({
  endsAt,
  frozenSeconds,
  skewMs = 0,
  className = "",
}: {
  endsAt: string | null;
  /** Set while paused — the clock holds this value instead of ticking. */
  frozenSeconds?: number | null;
  skewMs?: number;
  className?: string;
}) {
  const nowSeconds = useNowSeconds();

  const remaining =
    frozenSeconds !== null && frozenSeconds !== undefined
      ? frozenSeconds
      : endsAt !== null && nowSeconds !== null
        ? Math.round((Date.parse(endsAt) - (nowSeconds * 1000 + skewMs)) / 1000)
        : null;

  if (remaining === null) {
    return (
      <span className={`font-mono tabular-nums ${className}`} aria-hidden>
        --:--
      </span>
    );
  }

  const over = remaining < 0;
  const abs = Math.abs(remaining);
  const text = `${over ? "+" : ""}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(
    abs % 60,
  ).padStart(2, "0")}`;

  return (
    <span
      role="timer"
      aria-live="off"
      className={`font-mono tabular-nums ${
        over || remaining <= 30 ? "text-danger" : ""
      } ${className}`}
    >
      {text}
    </span>
  );
}
