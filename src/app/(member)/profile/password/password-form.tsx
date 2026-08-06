"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { changePassword, type PasswordState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
    >
      {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
      Save password
    </button>
  );
}

export function PasswordForm({ forced }: { forced: boolean }) {
  const [state, formAction] = useActionState<PasswordState, FormData>(
    changePassword,
    { error: null },
  );

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
        />
        <p className="text-xs text-muted">
          At least 10 characters, with a letter and a number.
        </p>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="confirm" className="text-sm font-medium">
          Confirm new password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
        />
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {state.error}
        </p>
      )}

      <SubmitButton />

      {!forced && (
        <a
          href="/profile"
          className="text-center text-sm text-muted underline underline-offset-2 hover:text-foreground"
        >
          Back to profile
        </a>
      )}
    </form>
  );
}
