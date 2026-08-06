"use client";

import { useState, useTransition } from "react";
import { BadgeCheck, Loader2 } from "lucide-react";
import { checkIn, type CheckInResult } from "./actions";

export function CheckInButton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CheckInResult | null>(null);

  if (result?.ok) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
        <BadgeCheck size={16} aria-hidden />
        {result.message}
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setResult(await checkIn(token));
          })
        }
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 size={16} className="animate-spin" aria-hidden />
            Checking in…
          </>
        ) : (
          <>
            <BadgeCheck size={16} aria-hidden />
            Check in
          </>
        )}
      </button>

      {result && !result.ok && (
        <p
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
