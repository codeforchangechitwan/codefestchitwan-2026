"use client";

import { PitchClock } from "@/components/pitch-clock";
import { usePitchState } from "@/lib/use-pitch-state";

/** The live half of /pitch. The board below it is server-rendered. */
export function PitchLive({ myTeamId }: { myTeamId: string | null }) {
  const { state, skewMs, degraded } = usePitchState();

  const status = state?.status ?? "idle";
  const mine = myTeamId !== null && state?.teamId === myTeamId;

  return (
    <div
      className={`rounded-2xl border p-5 text-center ${
        mine ? "border-brand bg-brand-soft" : "border-border bg-surface"
      }`}
    >
      {status === "idle" ? (
        <>
          <p className="text-sm text-muted">No team on stage right now.</p>
          <p className="mt-1 text-xs text-muted">
            The clock starts when the next pitch begins.
          </p>
        </>
      ) : (
        <>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
            {mine ? "You're on stage" : "On stage"}
            {status === "paused" ? " · paused" : ""}
          </p>
          <p className="mt-1 text-xl font-bold leading-tight">{state?.teamName}</p>
          <PitchClock
            endsAt={state?.endsAt ?? null}
            frozenSeconds={status === "paused" ? (state?.remainingSeconds ?? null) : null}
            skewMs={skewMs}
            className="mt-2 block text-5xl font-extrabold"
          />
          {state?.nextTeamName && (
            <p className="mt-2 text-xs text-muted">
              Up next: {state.nextTeamName}
            </p>
          )}
        </>
      )}
      {degraded && (
        <p className="mt-2 text-xs text-warning">Reconnecting to the live feed…</p>
      )}
    </div>
  );
}
