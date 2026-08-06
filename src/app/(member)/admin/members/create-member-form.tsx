"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Copy, Loader2, UserPlus } from "lucide-react";
import { ROLES, ROLE_LABELS } from "@/lib/types";
import { createMember, type MemberResult } from "../actions";

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
        <>
          <Loader2 size={16} className="animate-spin" aria-hidden />
          Creating account…
        </>
      ) : (
        <>
          <UserPlus size={16} aria-hidden />
          Create &amp; email password
        </>
      )}
    </button>
  );
}

export function CreateMemberForm() {
  const [state, formAction] = useActionState<MemberResult | null, FormData>(
    createMember,
    null,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Registered email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoCapitalize="none"
          spellCheck={false}
          className={FIELD}
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="full_name" className="text-sm font-medium">
          Full name
        </label>
        <input id="full_name" name="full_name" required className={FIELD} />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="role" className="text-sm font-medium">
          Category
        </label>
        <select id="role" name="role" defaultValue="participant" className={FIELD}>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label htmlFor="team_name" className="text-sm font-medium">
            Team <span className="font-normal text-muted">(optional)</span>
          </label>
          <input id="team_name" name="team_name" className={FIELD} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="phone" className="text-sm font-medium">
            Phone <span className="font-normal text-muted">(optional)</span>
          </label>
          <input id="phone" name="phone" type="tel" className={FIELD} />
        </div>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="institution" className="text-sm font-medium">
          Institution <span className="font-normal text-muted">(optional)</span>
        </label>
        <input id="institution" name="institution" className={FIELD} />
      </div>

      {state && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            state.ok
              ? "border-success/30 bg-success/10 text-success"
              : "border-danger/30 bg-danger/10 text-danger"
          }`}
        >
          <p>{state.message}</p>

          {state.password && (
            <div className="mt-3 rounded-lg bg-surface p-3">
              <p className="text-xs font-medium text-muted">
                Send these details to {state.email}
              </p>
              <p className="mt-1 font-mono text-base font-bold text-foreground">
                {state.password}
              </p>
              <button
                type="button"
                onClick={() =>
                  navigator.clipboard?.writeText(
                    `Email: ${state.email}\nPassword: ${state.password}`,
                  )
                }
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
              >
                <Copy size={12} aria-hidden />
                Copy
              </button>
            </div>
          )}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
