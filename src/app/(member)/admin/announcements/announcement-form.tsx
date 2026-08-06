"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Send } from "lucide-react";
import { ROLES, ROLE_LABELS } from "@/lib/types";
import { postAnnouncement, type AnnouncementResult } from "../actions";

const FIELD =
  "rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/25";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
    >
      {pending ? (
        <Loader2 size={16} className="animate-spin" aria-hidden />
      ) : (
        <Send size={16} aria-hidden />
      )}
      Post announcement
    </button>
  );
}

export function AnnouncementForm() {
  const [state, formAction] = useActionState<AnnouncementResult | null, FormData>(
    postAnnouncement,
    null,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-1.5">
        <label htmlFor="title" className="text-sm font-medium">
          Title
        </label>
        <input id="title" name="title" required className={FIELD} />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="body" className="text-sm font-medium">
          Message
        </label>
        <textarea id="body" name="body" required rows={4} className={FIELD} />
      </div>

      <fieldset>
        <legend className="text-sm font-medium">
          Who sees it{" "}
          <span className="font-normal text-muted">(none ticked = everyone)</span>
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {ROLES.map((role) => (
            <label
              key={role}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                name={`audience_${role}`}
                className="accent-[var(--brand)]"
              />
              {ROLE_LABELS[role]}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="urgent" className="accent-[var(--danger)]" />
        Mark as urgent
      </label>

      {state && (
        <p
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            state.ok
              ? "border-success/30 bg-success/10 text-success"
              : "border-danger/30 bg-danger/10 text-danger"
          }`}
        >
          {state.message}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
