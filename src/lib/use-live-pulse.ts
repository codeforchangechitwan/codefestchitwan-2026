"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * One websocket for the whole app.
 *
 * Every live screen listens to the same `live_pulse` insert stream and filters
 * by topic, rather than opening a channel each. A phone on the /pitch page
 * with the announcements banner mounted holds ONE connection, not three, which
 * matters when the hall has 150 of them behind one venue access point.
 *
 * A pulse carries no data — see the migration for why. It only says "topic X
 * moved"; the caller re-reads through the RPC it is already allowed to call.
 */

export type PulseTopic = "announcements" | "draw" | "event" | "leaderboard";

type Listener = (topic: PulseTopic) => void;

const listeners = new Set<Listener>();
let channel: RealtimeChannel | null = null;
let connected = false;
const connectionListeners = new Set<() => void>();

function setConnected(up: boolean) {
  if (connected === up) return;
  connected = up;
  for (const notify of connectionListeners) notify();
}

async function ensureChannel() {
  if (channel) return;

  const supabase = createClient();

  // Realtime authorises the socket with the access token, and RLS on
  // live_pulse requires `authenticated`. supabase-js normally wires this up on
  // its own, but doing it explicitly removes a first-paint race where the
  // channel subscribes before the session has been read out of the cookie.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;
  supabase.realtime.setAuth(session.access_token);

  channel = supabase
    .channel("live-pulse")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "live_pulse" },
      (payload) => {
        const topic = (payload.new as { topic?: string } | null)?.topic;
        if (!topic) return;
        for (const listener of listeners) listener(topic as PulseTopic);
      },
    )
    .subscribe((status) => {
      setConnected(status === "SUBSCRIBED");
    });
}

function teardownIfIdle() {
  if (listeners.size > 0 || !channel) return;
  const dead = channel;
  channel = null;
  setConnected(false);
  void dead.unsubscribe();
}

/**
 * Calls `onPulse` when one of `topics` moves.
 *
 * `live` reports whether the socket is actually up, so callers can fall back to
 * a faster poll on venue wifi instead of quietly going stale — the failure the
 * original polling comment in use-pitch-state.ts was worried about.
 */
export function useLivePulse(topics: PulseTopic[], onPulse: () => void) {
  // The handler is read through a ref so a caller passing an inline closure
  // does not resubscribe the channel on every render. Assigned in an effect,
  // never during render.
  const handlerRef = useRef(onPulse);
  useEffect(() => {
    handlerRef.current = onPulse;
  }, [onPulse]);

  const key = topics.join(",");

  useEffect(() => {
    const wanted = new Set(key.split(",") as PulseTopic[]);

    const listener: Listener = (topic) => {
      if (wanted.has(topic)) handlerRef.current();
    };

    listeners.add(listener);
    void ensureChannel();

    return () => {
      listeners.delete(listener);
      teardownIfIdle();
    };
  }, [key]);

  // Connection state is external mutable state shared by every caller, which
  // is exactly what useSyncExternalStore exists for — and it avoids seeding
  // the value with a setState inside an effect.
  return useSyncExternalStore(subscribeConnection, isConnected, isNotConnected);
}

function subscribeConnection(notify: () => void) {
  const listener = () => notify();
  connectionListeners.add(listener);
  return () => connectionListeners.delete(listener);
}

const isConnected = () => connected;
/** Server render: there is no socket, so the fallback poll is the truth. */
const isNotConnected = () => false;
