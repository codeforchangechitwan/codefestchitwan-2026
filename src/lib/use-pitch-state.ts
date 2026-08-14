"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLivePulse } from "@/lib/use-live-pulse";

export type PitchStatus = "idle" | "running" | "paused";

export type PitchState = {
  status: PitchStatus;
  teamId: string | null;
  teamCode: string | null;
  teamName: string | null;
  pitchOrder: number | null;
  label: string | null;
  durationSeconds: number;
  endsAt: string | null;
  remainingSeconds: number | null;
  nextTeamCode: string | null;
  nextTeamName: string | null;
  updatedAt: string | null;
  serverNow: string;
};

/** Safety net while the socket is up: a pulse can be missed, a socket can lie. */
const HEARTBEAT_LIVE_MS = 30000;
/** No socket — this is the old polling behaviour, unchanged. */
const FAST_MS = 2000;
const SLOW_MS = 10000;
const MAX_BACKOFF_MS = 30000;
const REQUEST_TIMEOUT_MS = 4000;

/**
 * The stage clock.
 *
 * State changes arrive as a realtime pulse on `event` and are read back
 * STRAIGHT FROM SUPABASE, so a hall of 150 phones watching the timer costs the
 * VPS nothing. It used to poll /api/pitch every 2s while a pitch ran — about
 * 75 req/s through nginx and Node on a 1 GB box, for data that changes maybe
 * six times an hour.
 *
 * The digits still run locally from the absolute deadline, corrected by the
 * server/client skew measured on each read, so a handset with a wrong clock
 * shows the right number.
 *
 * The old poll is kept verbatim as the fallback path, because the concern that
 * originally argued against realtime is real: venue wifi drops websockets. If
 * the socket is not up we poll exactly as before, and /api/pitch also covers
 * the case where the access token has expired — its 401 triggers the one
 * router.refresh() that renews the cookie.
 */
export function usePitchState() {
  const router = useRouter();

  const [state, setState] = useState<PitchState | null>(null);
  const [skewMs, setSkewMs] = useState(0);
  const [degraded, setDegraded] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(FAST_MS);
  const refreshedRef = useRef(false);
  const stoppedRef = useRef(false);
  const liveRef = useRef(false);

  /** Read by the cadence logic, which must not close over stale state. */
  const statusRef = useRef<PitchStatus>("idle");

  const apply = useCallback((payload: PitchState) => {
    statusRef.current = payload.status;
    setSkewMs(Date.parse(payload.serverNow) - Date.now());
    setState((current) =>
      current &&
      current.updatedAt === payload.updatedAt &&
      current.status === payload.status &&
      current.endsAt === payload.endsAt
        ? current
        : payload,
    );
    setDegraded(false);
  }, []);

  /** Primary path: the browser asks Supabase directly. */
  const readDirect = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("pitch_state");
    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) throw error ?? new Error("no pitch row");

    apply({
      status: row.status as PitchStatus,
      teamId: row.team_id,
      teamCode: row.team_code,
      teamName: row.team_name,
      pitchOrder: row.pitch_order,
      label: row.label,
      durationSeconds: row.duration_seconds,
      endsAt: row.ends_at,
      remainingSeconds: row.remaining_seconds,
      nextTeamCode: row.next_team_code,
      nextTeamName: row.next_team_name,
      updatedAt: row.updated_at,
      serverNow: row.server_now,
    });
  }, [apply]);

  /** Fallback path: the original /api/pitch poll, including cookie renewal. */
  const readViaApi = useCallback(async () => {
    const controller = new AbortController();
    const abort = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch("/api/pitch", {
        signal: controller.signal,
        cache: "no-store",
      });

      if (response.status === 401) {
        if (!refreshedRef.current) {
          refreshedRef.current = true;
          router.refresh();
        }
        throw new Error("unauthorised");
      }

      if (!response.ok) throw new Error(`status ${response.status}`);

      apply((await response.json()) as PitchState);
      refreshedRef.current = false;
    } finally {
      clearTimeout(abort);
    }
  }, [apply, router]);

  /** While the socket is up a pulse does the work, so the timer is only a
   *  safety net. Without it, fall back to the original cadence: fast while a
   *  pitch is on the clock, slow while the stage is idle. */
  const restIntervalMs = useCallback(
    () =>
      liveRef.current
        ? HEARTBEAT_LIVE_MS
        : statusRef.current === "running"
          ? FAST_MS
          : SLOW_MS,
    [],
  );

  const poll = useCallback(async () => {
    try {
      await readDirect();
      backoffRef.current = restIntervalMs();
    } catch {
      try {
        await readViaApi();
        backoffRef.current = restIntervalMs();
      } catch {
        backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
        setDegraded(true);
      }
    }
  }, [readDirect, readViaApi, restIntervalMs]);

  // A pulse means the timer was started, paused, extended or stopped — read it
  // back immediately rather than waiting for the heartbeat.
  const live = useLivePulse(["event"], () => {
    void poll();
  });

  // Mirrored into a ref so restIntervalMs() can read it without being
  // recreated, and assigned in an effect rather than during render.
  useEffect(() => {
    liveRef.current = live;
  }, [live]);

  useEffect(() => {
    stoppedRef.current = false;

    const arm = () => {
      if (stoppedRef.current) return;
      // setTimeout re-armed after each response, never setInterval, so a slow
      // response cannot stack requests.
      timerRef.current = setTimeout(run, backoffRef.current);
    };

    const run = async () => {
      if (document.visibilityState === "hidden") {
        arm();
        return;
      }
      await poll();
      arm();
    };

    void run();

    // Phones live in pockets. Come back instantly rather than up to 30s late.
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        if (timerRef.current) clearTimeout(timerRef.current);
        void run();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stoppedRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [poll, live]);

  return { state, skewMs, degraded, live, refresh: poll };
}
