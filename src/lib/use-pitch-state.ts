"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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

const FAST_MS = 2000;
const SLOW_MS = 10000;
const MAX_BACKOFF_MS = 30000;
const REQUEST_TIMEOUT_MS = 4000;

/**
 * Polls /api/pitch.
 *
 * Deliberately a poll and not Supabase Realtime: this codebase has no
 * client-side Supabase usage, and a websocket reconnect storm on venue wifi
 * mid-ceremony is a worse failure than a missed 2s tick.
 *
 * The poll carries STATE CHANGES only — start, pause, next. The digits run
 * locally from the absolute deadline, corrected by the server/client clock
 * skew measured on each response, so a phone with a wrong clock still shows
 * the right number.
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

  const poll = useCallback(async () => {
    const controller = new AbortController();
    const abort = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch("/api/pitch", {
        signal: controller.signal,
        cache: "no-store",
      });

      if (response.status === 401) {
        // The route is excluded from the proxy matcher so polls stay cheap,
        // which means nothing refreshes the auth cookie. One router.refresh()
        // goes through a matched route and renews it.
        if (!refreshedRef.current) {
          refreshedRef.current = true;
          router.refresh();
        }
        throw new Error("unauthorised");
      }

      if (!response.ok) throw new Error(`status ${response.status}`);

      const payload = (await response.json()) as PitchState;
      setSkewMs(Date.parse(payload.serverNow) - Date.now());
      setState((current) =>
        current &&
        current.updatedAt === payload.updatedAt &&
        current.status === payload.status &&
        current.endsAt === payload.endsAt
          ? current
          : payload,
      );

      refreshedRef.current = false;
      backoffRef.current = payload.status === "running" ? FAST_MS : SLOW_MS;
      setDegraded(false);
    } catch {
      backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
      setDegraded(true);
    } finally {
      clearTimeout(abort);
    }
  }, [router]);

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

    // Phones live in pockets. Come back instantly rather than up to 10s late.
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
  }, [poll]);

  return { state, skewMs, degraded, refresh: poll };
}
