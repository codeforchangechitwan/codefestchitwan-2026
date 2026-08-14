"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { saveHackathonSettings } from "./actions";

/**
 * Who is named on the screen, and how long the next start runs for.
 *
 * The length deliberately does NOT move a clock that is already running — the
 * only way to move a live deadline is the explicit +/- buttons, so nobody
 * shifts a deadline teams are pacing against by correcting a form field.
 */
export function HackathonSettingsForm({
  coordinatorName,
  coordinatorTitle,
  hours,
  running,
}: {
  coordinatorName: string;
  coordinatorTitle: string;
  hours: number;
  running: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  function onSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await saveHackathonSettings(formData);
      setFailed(!result.ok);
      setMessage(result.message);
    });
  }

  return (
    <form action={onSubmit} className="mt-10 grid gap-3 border-t border-border pt-8">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
        Clock settings
      </h2>

      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Started by</span>
        <input
          name="coordinator_name"
          defaultValue={coordinatorName}
          placeholder="Full name"
          className="rounded-xl border border-border bg-surface px-4 py-2.5 outline-none focus:border-brand"
        />
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Designation</span>
        <input
          name="coordinator_title"
          defaultValue={coordinatorTitle}
          placeholder="e.g. Program Coordinator"
          className="rounded-xl border border-border bg-surface px-4 py-2.5 outline-none focus:border-brand"
        />
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Length in hours</span>
        <input
          name="hours"
          type="number"
          min={1}
          max={96}
          step="0.5"
          defaultValue={hours}
          className="rounded-xl border border-border bg-surface px-4 py-2.5 font-mono outline-none focus:border-brand"
        />
        <span className="text-xs text-muted">
          {running
            ? "The clock is already running — this applies to the next start, not the current one. Use the +/- buttons above to move the live deadline."
            : "36 hours unless you change it."}
        </span>
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-60"
        >
          {pending ? (
            <Loader2 size={15} className="animate-spin" aria-hidden />
          ) : (
            <Check size={15} aria-hidden />
          )}
          Save
        </button>
        {message && (
          <span className={`text-sm ${failed ? "text-danger" : "text-success"}`}>
            {message}
          </span>
        )}
      </div>
    </form>
  );
}
