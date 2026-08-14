"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLivePulse, type PulseTopic } from "@/lib/use-live-pulse";

/**
 * Server-rendered data that then keeps itself current.
 *
 * The page still renders its first paint on the server, so a screen is correct
 * before any JavaScript runs and stays correct if the socket never connects.
 * From then on the browser re-reads DIRECTLY FROM SUPABASE — never back
 * through the Next server — so a hall full of live screens costs the VPS
 * nothing at all.
 *
 * Three things keep it honest under a bad venue network:
 *
 *  - jitter, so 150 phones woken by the same pulse do not arrive together;
 *  - a slow heartbeat that runs even while connected, because a socket can be
 *    up and still have missed a message;
 *  - a much faster heartbeat while disconnected, which is plain polling —
 *    degraded, but never stale.
 */

const JITTER_MS = 600;
const HEARTBEAT_LIVE_MS = 45_000;
const HEARTBEAT_OFFLINE_MS = 6_000;

export function useLiveQuery<T>({
  topics,
  initial,
  fetcher,
}: {
  topics: PulseTopic[];
  initial: T;
  fetcher: () => Promise<T>;
}) {
  const [data, setData] = useState<T>(initial);
  const [stale, setStale] = useState(false);

  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  const refetch = useCallback(async () => {
    // A burst of pulses during a draw must not stack requests.
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const next = await fetcherRef.current();
      if (mountedRef.current) {
        setData(next);
        setStale(false);
      }
    } catch {
      if (mountedRef.current) setStale(true);
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  const schedule = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(refetch, Math.random() * JITTER_MS);
  }, [refetch]);

  const live = useLivePulse(topics, schedule);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Heartbeat. Slow while the socket is up, fast while it is not.
  useEffect(() => {
    const period = live ? HEARTBEAT_LIVE_MS : HEARTBEAT_OFFLINE_MS;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void refetch();
    }, period);
    return () => clearInterval(id);
  }, [live, refetch]);

  // Phones live in pockets. Coming back to the screen should not show the
  // state it had when it went in.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refetch();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refetch]);

  return { data, live, stale, refetch };
}
