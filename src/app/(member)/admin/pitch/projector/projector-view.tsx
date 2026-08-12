"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize } from "lucide-react";
import { PitchClock } from "@/components/pitch-clock";
import { usePitchState } from "@/lib/use-pitch-state";

/**
 * The hall screen.
 *
 * Rendered as a fixed overlay rather than its own root layout: a nested route
 * cannot drop the root layout, and restructuring the app into two root layouts
 * to escape the header and bottom nav would touch every existing route. z-50
 * clears the nav's z-40.
 */
export function ProjectorView() {
  const { state, skewMs, degraded } = usePitchState();
  const rootRef = useRef<HTMLDivElement>(null);
  const [wakeFailed, setWakeFailed] = useState(false);

  // Best effort: stop the laptop sleeping mid-ceremony. Unsupported on some
  // browsers and rejected without a user gesture on others — neither matters.
  useEffect(() => {
    let sentinel: { release: () => Promise<void> } | null = null;
    const request = async () => {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (type: "screen") => Promise<typeof sentinel> };
        };
        sentinel = (await nav.wakeLock?.request("screen")) ?? null;
      } catch {
        setWakeFailed(true);
      }
    };
    void request();
    return () => {
      void sentinel?.release().catch(() => {});
    };
  }, []);

  const status = state?.status ?? "idle";
  const paused = status === "paused";

  return (
    <div
      ref={rootRef}
      className="projector fixed inset-0 z-50 flex h-dvh w-dvw flex-col items-center justify-center overflow-hidden bg-background px-8 text-foreground"
    >
      <button
        type="button"
        onClick={() => void rootRef.current?.requestFullscreen?.().catch(() => {})}
        className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold opacity-40 transition-opacity hover:opacity-100"
      >
        <Maximize size={15} aria-hidden />
        Fullscreen
      </button>

      {state?.pitchOrder && (
        <p className="absolute left-6 top-5 font-mono text-[1.6vw] tracking-widest text-muted">
          {state.teamCode} · #{state.pitchOrder}
        </p>
      )}

      {status === "idle" ? (
        <p className="text-[5vw] font-bold text-muted">Codefest Chitwan 2026</p>
      ) : (
        <>
          <p className="max-w-[92vw] text-center text-[7vw] font-extrabold leading-none">
            {state?.teamName}
          </p>
          <PitchClock
            endsAt={state?.endsAt ?? null}
            frozenSeconds={paused ? (state?.remainingSeconds ?? null) : null}
            skewMs={skewMs}
            className="mt-[2vh] text-[18vw] font-extrabold leading-none"
          />
          {paused && (
            <p className="text-[3vw] font-bold uppercase tracking-[0.3em] text-warning">
              Paused
            </p>
          )}
        </>
      )}

      {state?.nextTeamName && (
        <p className="absolute bottom-6 text-[2vw] text-muted">
          Up next · <span className="font-semibold">{state.nextTeamName}</span>
        </p>
      )}

      {/* Never a stack trace in front of two hundred people. */}
      {(degraded || wakeFailed) && (
        <span
          className="absolute bottom-4 right-4 h-3 w-3 rounded-full bg-warning"
          title={degraded ? "Reconnecting" : "Screen may sleep"}
          aria-hidden
        />
      )}
    </div>
  );
}
