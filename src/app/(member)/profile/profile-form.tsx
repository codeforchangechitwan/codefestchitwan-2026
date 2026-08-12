"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { Profile } from "@/lib/types";
import { updateProfile, type ProfileState } from "./actions";

const FIELD_CLASS =
  "rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/25";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
    >
      {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
      Save changes
    </button>
  );
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useActionState<ProfileState, FormData>(
    updateProfile,
    { error: null },
  );

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-1.5">
        <label htmlFor="full_name" className="text-sm font-medium">
          Full name
        </label>
        <input
          id="full_name"
          name="full_name"
          defaultValue={profile.full_name}
          required
          autoComplete="name"
          className={FIELD_CLASS}
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="phone" className="text-sm font-medium">
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          defaultValue={profile.phone ?? ""}
          autoComplete="tel"
          placeholder="98XXXXXXXX"
          className={FIELD_CLASS}
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="institution" className="text-sm font-medium">
          College / institution
        </label>
        <input
          id="institution"
          name="institution"
          defaultValue={profile.institution ?? ""}
          className={FIELD_CLASS}
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
    </form>
  );
}
