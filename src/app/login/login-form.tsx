"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { signIn, type LoginState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary-glass mt-2 inline-flex w-full items-center justify-center gap-2 py-3.5 text-xs font-extrabold uppercase tracking-wider disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 size={16} className="animate-spin" aria-hidden />
          Authenticating…
        </>
      ) : (
        <>
          <LockKeyhole size={16} aria-hidden />
          Sign in to Portal
        </>
      )}
    </button>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(signIn, {
    error: null,
  });
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="next" value={next} />

      <div className="grid gap-1.5">
        <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted">
          Registered Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          placeholder="you@example.com"
          className="rounded-xl border border-glass bg-surface/60 px-4 py-3 text-sm text-foreground outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/25"
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"} /* type="password" */
            autoComplete="current-password"
            required
            placeholder="From your Codefest email"
            className="w-full rounded-xl border border-glass bg-surface/60 px-4 py-3 pr-12 text-sm text-foreground outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/25"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex items-center px-3.5 text-muted hover:text-foreground"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-xs font-semibold text-danger"
        >
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}

