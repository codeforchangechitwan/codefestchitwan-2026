"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { saveCeremonyDetails } from "./actions";

/**
 * Chief guest details, editable from the phone of whoever is standing next to
 * them. Names on a programme change late — this is the difference between a
 * projector saying "To be announced" and saying the right name.
 */
export function CeremonyDetailsForm({
  guestName,
  guestTitle,
  title,
}: {
  guestName: string;
  guestTitle: string;
  title: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  function onSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await saveCeremonyDetails(formData);
      setFailed(!result.ok);
      setMessage(result.message);
    });
  }

  return (
    <form action={onSubmit} className="mt-10 grid gap-3 border-t border-border pt-8">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
        Ceremony details
      </h2>

      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Chief guest</span>
        <input
          name="guest_name"
          defaultValue={guestName}
          placeholder="Full name"
          className="rounded-xl border border-border bg-surface px-4 py-2.5 outline-none focus:border-brand"
        />
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Designation</span>
        <input
          name="guest_title"
          defaultValue={guestTitle}
          placeholder="e.g. Mayor, Bharatpur Metropolitan City"
          className="rounded-xl border border-border bg-surface px-4 py-2.5 outline-none focus:border-brand"
        />
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Headline on the screen</span>
        <input
          name="title"
          defaultValue={title}
          placeholder="Codefest Chitwan 2026"
          className="rounded-xl border border-border bg-surface px-4 py-2.5 outline-none focus:border-brand"
        />
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
