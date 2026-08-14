"use client";

import { useState, useTransition } from "react";
import { Loader2, Play, RotateCcw, Timer, TriangleAlert } from "lucide-react";
import { HackClock } from "@/components/hack-clock";
import type { HackathonState } from "@/lib/hackathon";
import { useHackathon } from "@/lib/use-hackathon";
import { extendHackathon, resetHackathon, startHackathon } from "./actions";

const ENDS_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Kathmandu",
});

export function HackathonView({
  initial,
  canControl,
}: {
  initial: HackathonState;
  canControl: boolean;
}) {
  const { data, live, stale } = useHackathon(initial);

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmStart, setConfirmStart] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const hours = Math.round(data.durationSeconds / 3600);

  function run(work: () => Promise<{ ok: boolean; message: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await work();
      if (!result.ok) setError(result.message);
      setConfirmStart(false);
      setConfirmReset(false);
    });
  }

  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center px-6 py-10 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-muted">
        {data.status === "idle"
          ? `${hours}-hour hackathon`
          : data.status === "finished"
            ? "Time is up"
            : "Time remaining"}
      </p>

      {data.status === "idle" ? (
        <>
          <h1 className="mt-4 text-balance text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            Ready to start
          </h1>
          <p className="mt-4 max-w-md text-sm text-muted">
            The clock starts when{" "}
            <strong className="text-fg">
              {data.coordinatorName?.trim() || "the programme coordinator"}
            </strong>{" "}
            presses the button. Every screen in the building starts counting
            down at the same instant.
          </p>
        </>
      ) : (
        <>
          <HackClock
            endsAt={data.endsAt}
            skewMs={data.skewMs}
            className="mt-4 block text-6xl font-extrabold leading-none sm:text-8xl"
          />
          {data.endsAt && (
            <p className="mt-5 text-sm text-muted">
              {data.status === "finished" ? "Ended" : "Ends"}{" "}
              {ENDS_FORMATTER.format(new Date(data.endsAt))} · Nepal time
            </p>
          )}
        </>
      )}

      {/* Who runs the clock ------------------------------------------------ */}
      <div className="mt-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted">
          {data.status === "idle" ? "Started by" : "Clock started by"}
        </p>
        <p className="mt-2 text-xl font-bold sm:text-2xl">
          {data.coordinatorName?.trim() || "To be announced"}
        </p>
        {data.coordinatorTitle?.trim() && (
          <p className="mt-1 text-sm text-muted">{data.coordinatorTitle}</p>
        )}
      </div>

      {data.status === "finished" && (
        <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-danger/30 bg-danger/10 px-5 py-2.5 text-sm font-semibold text-danger">
          <TriangleAlert size={16} aria-hidden />
          Hacking has ended — hands off keyboards
        </p>
      )}

      {/* Controls ---------------------------------------------------------- */}
      {canControl && (
        <div className="mt-10 w-full max-w-sm">
          {error && (
            <p className="mb-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          )}

          {data.status === "idle" ? (
            confirmStart ? (
              /* Two taps, unlike the ribbon. Cutting a ribbon early is a
                 rehearsal; starting this early puts a wrong deadline on every
                 screen in the building for the next day and a half. */
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => run(startHackathon)}
                  disabled={pending}
                  className="flex-1 rounded-2xl bg-brand px-4 py-4 text-base font-bold text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
                >
                  {pending ? (
                    <Loader2
                      size={18}
                      className="mx-auto animate-spin"
                      aria-hidden
                    />
                  ) : (
                    `Confirm — start ${hours} hours now`
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmStart(false)}
                  className="rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmStart(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-5 text-lg font-bold text-white transition-colors hover:bg-brand-strong"
              >
                <Play size={20} aria-hidden />
                Start the {hours}-hour clock
              </button>
            )
          ) : (
            <div className="grid gap-3">
              <div className="flex items-center justify-center gap-2">
                {[-30, -10, 10, 30].map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => run(() => extendHackathon(minutes))}
                    disabled={pending || data.status === "finished"}
                    className="rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs font-semibold transition-colors hover:border-brand/40 disabled:opacity-40"
                  >
                    {minutes > 0 ? `+${minutes}` : minutes}m
                  </button>
                ))}
              </div>

              {confirmReset ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => run(resetHackathon)}
                    disabled={pending}
                    className="flex-1 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger disabled:opacity-60"
                  >
                    Really stop and clear the clock?
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  disabled={pending}
                  className="inline-flex items-center justify-center gap-2 self-center rounded-xl border border-border bg-surface px-4 py-2.5 text-xs font-semibold text-muted transition-colors hover:border-brand/40 disabled:opacity-60"
                >
                  <RotateCcw size={14} aria-hidden />
                  Reset (rehearsal)
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <p className="mt-8 inline-flex items-center gap-1.5 text-[11px] text-muted">
        <Timer size={12} aria-hidden />
        {stale
          ? "Reconnecting…"
          : live
            ? "Live on every device"
            : "Live updates unavailable — refreshing on a timer"}
        {data.startedByName && data.status !== "idle" && ` · ${data.startedByName}`}
      </p>
    </div>
  );
}
