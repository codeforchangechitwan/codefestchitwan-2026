"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Loader2,
  Monitor,
  Pause,
  Play,
  Plus,
  SkipForward,
  Square,
} from "lucide-react";
import { PitchClock } from "@/components/pitch-clock";
import { usePitchState } from "@/lib/use-pitch-state";
import { setPitch, type PitchAction } from "./actions";

type BoardTeam = {
  id: string;
  code: string;
  name: string;
  pitchOrder: number;
};

const PRESETS = [3, 5, 7];

export function PitchControls({ board }: { board: BoardTeam[] }) {
  const { state, skewMs, degraded, refresh } = usePitchState();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: PitchAction, team: string | null = null, seconds: number | null = null) {
    setError(null);
    startTransition(async () => {
      const result = await setPitch(action, team, seconds);
      if (!result.ok) setError(result.message);
      await refresh();
    });
  }

  const status = state?.status ?? "idle";
  const running = status === "running";
  const paused = status === "paused";

  return (
    <div className="grid gap-4">
      {/* Current ---------------------------------------------------------- */}
      <div className="rounded-2xl border border-border bg-surface p-5 text-center">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
          {status === "idle" ? "Nothing on stage" : `On stage · ${status}`}
        </p>
        <p className="mt-1 text-xl font-bold leading-tight">
          {state?.teamName ?? "—"}
        </p>
        {state?.teamCode && (
          <p className="font-mono text-xs tracking-widest text-muted">
            {state.teamCode}
            {state.pitchOrder ? ` · #${state.pitchOrder}` : ""}
          </p>
        )}
        <PitchClock
          endsAt={state?.endsAt ?? null}
          frozenSeconds={paused ? (state?.remainingSeconds ?? null) : null}
          skewMs={skewMs}
          className="mt-3 block text-5xl font-extrabold"
        />
        {state?.nextTeamName && (
          <p className="mt-2 text-xs text-muted">
            Up next: {state.nextTeamName} ({state.nextTeamCode})
          </p>
        )}
        {degraded && (
          <p className="mt-2 text-xs text-warning">
            Reconnecting to the live feed…
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {/* Controls --------------------------------------------------------- */}
      <div className="grid gap-2">
        <div className="flex gap-2">
          {PRESETS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              disabled={pending}
              onClick={() => run("start", null, minutes * 60)}
              className="flex-1 rounded-xl bg-brand px-3 py-3 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-60"
            >
              Start {minutes} min
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending || status === "idle"}
            onClick={() => run(paused ? "resume" : "pause")}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-3 text-sm font-semibold hover:border-brand/40 disabled:opacity-60"
          >
            {pending ? (
              <Loader2 size={15} className="animate-spin" aria-hidden />
            ) : paused ? (
              <Play size={15} aria-hidden />
            ) : (
              <Pause size={15} aria-hidden />
            )}
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            disabled={pending || status === "idle"}
            onClick={() => run("extend", null, 30)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-3 text-sm font-semibold hover:border-brand/40 disabled:opacity-60"
          >
            <Plus size={14} aria-hidden />
            30s
          </button>
          <button
            type="button"
            disabled={pending || status === "idle"}
            onClick={() => run("extend", null, 60)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-3 text-sm font-semibold hover:border-brand/40 disabled:opacity-60"
          >
            <Plus size={14} aria-hidden />
            1 min
          </button>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => run("next")}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-3 py-3 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-60"
          >
            <SkipForward size={15} aria-hidden />
            Next team
          </button>
          <button
            type="button"
            disabled={pending || status === "idle"}
            onClick={() => run("stop")}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger disabled:opacity-60"
          >
            <Square size={14} aria-hidden />
            Stop
          </button>
        </div>

        <Link
          href="/admin/pitch/projector"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold hover:border-brand/40"
        >
          <Monitor size={15} aria-hidden />
          Open the projector view
        </Link>
      </div>

      {/* Board ------------------------------------------------------------ */}
      {board.length > 0 && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
            Running order
          </h2>
          <ol className="mt-3 grid gap-2">
            {board.map((team) => (
              <li key={team.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run("start", team.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors disabled:opacity-60 ${
                    state?.teamId === team.id
                      ? "border-brand bg-brand-soft"
                      : "border-border bg-surface hover:border-brand/40"
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft font-mono text-sm font-bold text-brand">
                    {team.pitchOrder}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold leading-tight">
                      {team.name}
                    </span>
                    <span className="block font-mono text-xs text-muted">
                      {team.code}
                    </span>
                  </span>
                  {running && state?.teamId === team.id && (
                    <span className="shrink-0 text-xs font-semibold text-brand">
                      on stage
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-muted">
            Tap any team to put them on stage out of sequence.
          </p>
        </div>
      )}
    </div>
  );
}
