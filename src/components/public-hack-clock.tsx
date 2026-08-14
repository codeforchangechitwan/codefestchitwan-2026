"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { HackClock } from "@/components/hack-clock";

export type PublicHackState = {
  status: "idle" | "running" | "finished";
  endsAt: string | null;
  coordinatorName: string | null;
  skewMs: number;
};

/**
 * How often an anonymous visitor re-reads the clock.
 *
 * Deliberately NOT useLiveQuery. That hook rides the `live_pulse` websocket,
 * and RLS on live_pulse requires `authenticated` — a signed-out visitor can
 * never open that socket, so useLiveQuery would fall back to its disconnected
 * heartbeat and poll every 6 seconds, forever, from every browser that happens
 * to have the marketing page open.
 *
 * It does not need to be fast. The digits run locally off the absolute
 * `ends_at`, so a re-read is only needed to notice the clock being started,
 * extended or reset — three events across a whole weekend.
 */
const REFRESH_MS = 60_000;

export function PublicHackClock({
  initial,
  fallback,
}: {
  initial: PublicHackState;
  /** Shown while the clock has not been started (the pre-event countdown). */
  fallback: ReactNode;
}) {
  const [state, setState] = useState(initial);

  const read = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("hackathon_public");
      const row = Array.isArray(data) ? data[0] : null;
      if (error || !row) return;

      setState({
        status: row.status,
        endsAt: row.ends_at,
        coordinatorName: row.coordinator_name,
        skewMs: Date.parse(row.server_now) - Date.now(),
      });
    } catch {
      // Keep showing the last good value. A marketing page must not turn into
      // an error because the database blinked.
    }
  }, []);

  // Read once on mount so a CDN- or browser-cached shell corrects itself
  // immediately, then settle into the slow refresh.
  // The first read goes through a timer rather than running in the effect
  // body: the state it sets must land in its own tick, not during the mount
  // commit. Same shape as use-live-query's scheduler.
  useEffect(() => {
    const kick = setTimeout(() => void read(), 0);
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void read();
    }, REFRESH_MS);
    return () => {
      clearTimeout(kick);
      clearInterval(id);
    };
  }, [read]);

  if (state.status === "idle") return <>{fallback}</>;

  const finished = state.status === "finished";

  return (
    <div className="inline-block rounded-2xl border border-glass bg-surface/40 px-5 py-4 backdrop-blur-md">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted/90">
        <span
          className={`h-1.5 w-1.5 rounded-full ${finished ? "bg-danger" : "bg-brand"}`}
        />
        {finished ? "Hacking has ended" : "Hacking time remaining"}
      </p>
      <HackClock
        endsAt={state.endsAt}
        skewMs={state.skewMs}
        className="mt-1.5 block text-4xl font-black sm:text-5xl"
      />
    </div>
  );
}
