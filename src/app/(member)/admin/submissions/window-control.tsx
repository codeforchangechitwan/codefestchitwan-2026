"use client";

import { useState, useTransition } from "react";
import { Loader2, Lock, LockOpen } from "lucide-react";
import { setSubmissionWindow } from "../actions";

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
}: {
  deadline: string;
  open: boolean;
}) {
  const [value, setValue] = useState(() => toLocalInputValue(deadline));
  const [result, setResult] = useState<string | null>(null);
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

      {result && (
        <p role="status" className="mt-2 text-sm text-brand">
          {result}
        </p>
      )}
    </div>
  );
}
