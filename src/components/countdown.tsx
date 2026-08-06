"use client";

import { useSyncExternalStore } from "react";

type Parts = { days: number; hours: number; minutes: number; seconds: number };

/*
 * The clock is an external system, so it is read through
 * useSyncExternalStore rather than mirrored into state from an effect. The
 * server snapshot is null, which renders a fixed-height placeholder and keeps
 * hydration stable.
 */

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}

function getSnapshot() {
  // Bucketed to whole seconds so React only re-renders once per tick.
  return Math.floor(Date.now() / 1000);
}

function getServerSnapshot(): number | null {
  return null;
}

function partsUntil(targetMs: number, nowSeconds: number): Parts | null {
  const diff = targetMs - nowSeconds * 1000;
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export function Countdown({ target, label }: { target: string; label: string }) {
  const nowSeconds = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (nowSeconds === null) {
    return <div className="h-[76px]" aria-hidden />;
  }

  const parts = partsUntil(new Date(target).getTime(), nowSeconds);

  if (!parts) {
    return (
      <p className="text-sm font-semibold text-accent">
        The hackathon is underway — check the schedule for what&rsquo;s next.
      </p>
    );
  }

  const cells: [number, string][] = [
    [parts.days, "days"],
    [parts.hours, "hrs"],
    [parts.minutes, "min"],
    [parts.seconds, "sec"],
  ];

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-white/70">
        {label}
      </p>
      <div className="mt-2 flex gap-2" role="timer" aria-live="off">
        {cells.map(([value, unit]) => (
          <div
            key={unit}
            className="min-w-[58px] rounded-xl bg-white/15 px-2 py-2 text-center backdrop-blur"
          >
            <div className="font-mono text-xl font-bold tabular-nums text-white">
              {String(value).padStart(2, "0")}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-white/70">
              {unit}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
