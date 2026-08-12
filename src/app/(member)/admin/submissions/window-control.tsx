"use client";

import { useState, useTransition } from "react";
import { Gavel, Loader2, Lock, LockOpen } from "lucide-react";
import { setJudgingOpen, setSubmissionWindow } from "../actions";

/**
 * The deadline is stored as an absolute instant. This edits it in Kathmandu
 * time, because that is the only clock anyone at the venue is reading.
 */
const KATHMANDU_OFFSET_MINUTES = 5 * 60 + 45;

function toLocalInputValue(iso: string) {
  const shifted = new Date(
    new Date(iso).getTime() + KATHMANDU_OFFSET_MINUTES * 60_000,
  );
  return shifted.toISOString().slice(0, 16);
}

function fromLocalInputValue(value: string) {
  return new Date(
    new Date(`${value}:00Z`).getTime() - KATHMANDU_OFFSET_MINUTES * 60_000,
  ).toISOString();
}

export function WindowControl({
  deadline,
  open,
  judgingOpen,
}: {
  deadline: string;
  open: boolean;
  judgingOpen: boolean;
}) {
  const [value, setValue] = useState(() => toLocalInputValue(deadline));
  const [result, setResult] = useState<string | null>(null);
  const [judging, setJudging] = useState(judgingOpen);
  const [pending, startTransition] = useTransition();

  function save(nextOpen: boolean) {
    startTransition(async () => {
      const outcome = await setSubmissionWindow(
        fromLocalInputValue(value),
        nextOpen,
      );
      setResult(outcome.message);
    });
  }

  function toggleJudging(next: boolean) {
    startTransition(async () => {
      const outcome = await setJudgingOpen(next);
      setResult(outcome.message);
      if (outcome.ok) setJudging(next);
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
        Submission window
      </h2>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="grid gap-1.5">
          <label htmlFor="deadline" className="text-sm font-medium">
            Deadline (Nepal time)
          </label>
          <input
            id="deadline"
            type="datetime-local"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => save(true)}
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
          >
            {pending ? (
              <Loader2 size={15} className="animate-spin" aria-hidden />
            ) : (
              <LockOpen size={15} aria-hidden />
            )}
            Save &amp; open
          </button>
          <button
            type="button"
            onClick={() => save(false)}
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger transition-colors hover:border-danger/50 disabled:opacity-60"
          >
            <Lock size={15} aria-hidden />
            Close now
          </button>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">
        Currently{" "}
        <span className={open ? "font-semibold text-success" : "font-semibold text-danger"}>
          {open ? "open" : "closed"}
        </span>
        . Closing takes effect immediately — the database refuses writes, not just
        the form.
      </p>

      {/* Judging ------------------------------------------------------- */}
      <div className="mt-5 border-t border-border pt-4">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
          <Gavel size={14} aria-hidden />
          Judging panel
        </h2>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => toggleJudging(!judging)}
            disabled={pending}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
              judging
                ? "border border-danger/30 bg-danger/10 text-danger hover:border-danger/50"
                : "bg-brand text-white hover:bg-brand-strong"
            }`}
          >
            {pending ? (
              <Loader2 size={15} className="animate-spin" aria-hidden />
            ) : judging ? (
              <Lock size={15} aria-hidden />
            ) : (
              <Gavel size={15} aria-hidden />
            )}
            {judging ? "Close judging" : "Open judging"}
          </button>

          <p className="text-xs text-muted">
            Judges currently see{" "}
            <span
              className={
                judging ? "font-semibold text-success" : "font-semibold text-danger"
              }
            >
              {judging ? "every submitted entry" : "nothing at all"}
            </span>
            . Open this at the Sunday briefing, once submissions are closed.
          </p>
        </div>
      </div>

      {result && (
        <p role="status" className="mt-3 text-sm text-brand">
          {result}
        </p>
      )}
    </div>
  );
}
