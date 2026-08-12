"use client";

import { useSyncExternalStore } from "react";

type Parts = { days: number; hours: number; minutes: number; seconds: number };

/*
 * The clock is an external system, so it is read through useSyncExternalStore
 * rather than mirrored into state from an effect. The server snapshot is null,
 * which renders a fixed-height placeholder and keeps hydration stable.
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
  if (Number.isNaN(targetMs)) return null;
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
    getServerSnapshot
  );

  if (nowSeconds === null) {
    return <div className="h-[84px] w-full max-w-sm rounded-2xl bg-surface/30 animate-pulse" aria-hidden />;
  }

  const parts = partsUntil(new Date(target).getTime(), nowSeconds);

  if (!parts) {
    return (
      <div className="inline-flex items-center gap-2 rounded-xl bg-accent-soft border border-accent/30 px-4 py-2 text-sm font-semibold text-accent backdrop-blur-md">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
        </span>
        The hackathon is underway — check the schedule for live sessions.
      </div>
    );
  }

  const cells: [number, string][] = [
    [parts.days, "Days"],
    [parts.hours, "Hours"],
    [parts.minutes, "Mins"],
    [parts.seconds, "Secs"],
  ];

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted/90 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-brand" />
        {label}
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2.5" role="timer" aria-live="off">
        {cells.map(([value, unit]) => (
          <div
            key={unit}
            className="group relative min-w-[68px] rounded-xl border border-glass bg-surface-glass p-3 text-center backdrop-blur-xl shadow-lg transition-all duration-300 hover:border-brand/40 hover:shadow-brand/10"
          >
            <div className="font-mono text-2xl font-extrabold tabular-nums bg-gradient-to-b from-foreground to-muted bg-clip-text text-transparent">
              {String(value).padStart(2, "0")}
            </div>
            <div className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-muted">
              {unit}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

