"use client";

import { useSyncExternalStore } from "react";

/*
 * Same clock pattern as components/countdown.tsx — read through
 * useSyncExternalStore rather than mirrored into state from an effect. That
 * one is hard-styled for the dark hero (text-white on bg-white/15), so this is
 * a deliberate copy rather than a shared component.
 */

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}

function getSnapshot() {
  return Math.floor(Date.now() / 1000);
}

function getServerSnapshot(): number | null {
  return null;
}

export function DeadlineCountdown({ deadline }: { deadline: string }) {
  const nowSeconds = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  // Fixed height keeps hydration stable.
  if (nowSeconds === null) return <div className="h-[42px]" aria-hidden />;

  const diff = new Date(deadline).getTime() - nowSeconds * 1000;

  if (diff <= 0) {
    return (
      <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
        The submission deadline has passed.
      </p>
    );
  }

  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff / 60_000) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  const urgent = diff < 3_600_000;

  return (
    <p
      role="timer"
      aria-live="off"
      className={`rounded-xl px-4 py-3 text-sm font-semibold ${
        urgent
          ? "border border-danger/30 bg-danger/10 text-danger"
          : "bg-brand-soft text-brand"
      }`}
    >
      Time left to submit:{" "}
      <span className="font-mono tabular-nums">
        {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:
        {String(seconds).padStart(2, "0")}
      </span>
    </p>
  );
}
