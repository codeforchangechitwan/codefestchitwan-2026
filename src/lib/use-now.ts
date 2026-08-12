"use client";

import { useSyncExternalStore } from "react";

/*
 * A 1 Hz clock, read through useSyncExternalStore rather than mirrored into
 * state from an effect. The server snapshot is null so SSR output is
 * deterministic and hydration stays stable — callers render a fixed-size
 * placeholder while it is null.
 *
 * Extracted because the pitch timer needs the identical primitive on three new
 * surfaces (projector, exec console, /pitch). components/countdown.tsx and
 * submit/deadline-countdown.tsx keep their own copies on purpose: they work,
 * one sits on the submission path, and refactoring them before the event buys
 * nothing. quiz-runner keeps setInterval because it must fire an action at
 * zero, which this does not express.
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

export function useNowSeconds(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
