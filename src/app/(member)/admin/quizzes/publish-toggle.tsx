"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { setQuizPublished } from "../actions";

export function PublishToggle({
  quizId,
  published,
}: {
  quizId: string;
  published: boolean;
}) {
  const [isPublished, setIsPublished] = useState(published);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const next = !isPublished;
            const result = await setQuizPublished(quizId, next);
            if (result.ok) {
              setIsPublished(next);
              setError(null);
            } else {
              setError(result.message);
            }
          })
        }
        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
          isPublished
            ? "border border-border hover:border-brand/40"
            : "bg-brand text-white hover:bg-brand-strong"
        }`}
      >
        {pending ? (
          <Loader2 size={15} className="animate-spin" aria-hidden />
        ) : isPublished ? (
          <EyeOff size={15} aria-hidden />
        ) : (
          <Eye size={15} aria-hidden />
        )}
        {isPublished ? "Hide from members" : "Publish"}
      </button>

      <p className="mt-2 text-xs text-muted">
        {isPublished ? "Visible to members now." : "Hidden — members can't see it."}
      </p>

      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
