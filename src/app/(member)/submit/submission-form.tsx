"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Save, Send } from "lucide-react";
import type { Submission } from "@/lib/types";
import { saveSubmission, type SubmissionResult } from "./actions";

const FIELD =
  "rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/25";

function Buttons({ locked }: { locked: boolean }) {
  const { pending } = useFormStatus();
  const disabled = pending || locked;

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <button
        type="submit"
        name="intent"
        value="draft"
        disabled={disabled}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold transition-colors hover:border-brand/40 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 size={16} className="animate-spin" aria-hidden />
        ) : (
          <Save size={16} aria-hidden />
        )}
        Save draft
      </button>
      <button
        type="submit"
        name="intent"
        value="final"
        disabled={disabled}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
      >
        {pending ? (
          <Loader2 size={16} className="animate-spin" aria-hidden />
        ) : (
          <Send size={16} aria-hidden />
        )}
        Submit project
      </button>
    </div>
  );
}

export function SubmissionForm({
  submission,
  locked,
}: {
  submission: Submission | null;
  locked: boolean;
}) {
  const [state, formAction] = useActionState<SubmissionResult, FormData>(
    saveSubmission,
    null,
  );

  return (
    <form action={formAction} className="mt-4 grid gap-4">
      <div className="grid gap-1.5">
        <label htmlFor="title" className="text-sm font-medium">
          Project title
        </label>
        <input
          id="title"
          name="title"
          defaultValue={submission?.title ?? ""}
          maxLength={120}
          className={FIELD}
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          What does it do?
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          defaultValue={submission?.description ?? ""}
          placeholder="The problem, your approach, and what works so far."
          className={FIELD}
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="repo_url" className="text-sm font-medium">
          Repository link <span className="text-muted">(required to submit)</span>
        </label>
        <input
          id="repo_url"
          name="repo_url"
          type="url"
          inputMode="url"
          defaultValue={submission?.repo_url ?? ""}
          placeholder="https://github.com/your-team/project"
          className={FIELD}
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="demo_url" className="text-sm font-medium">
          Live demo link <span className="text-muted">(optional)</span>
        </label>
        <input
          id="demo_url"
          name="demo_url"
          type="url"
          inputMode="url"
          defaultValue={submission?.demo_url ?? ""}
          placeholder="https://your-project.vercel.app"
          className={FIELD}
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="video_url" className="text-sm font-medium">
          Video / walkthrough <span className="text-muted">(optional)</span>
        </label>
        <input
          id="video_url"
          name="video_url"
          type="url"
          inputMode="url"
          defaultValue={submission?.video_url ?? ""}
          placeholder="https://youtu.be/..."
          className={FIELD}
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="deck_url" className="text-sm font-medium">
          Pitch deck{" "}
          <span className="text-muted">(strongly recommended — the judges see this)</span>
        </label>
        <input
          id="deck_url"
          name="deck_url"
          type="url"
          inputMode="url"
          defaultValue={submission?.deck_url ?? ""}
          placeholder="https://docs.google.com/presentation/..."
          className={FIELD}
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="docs_url" className="text-sm font-medium">
          Documentation <span className="text-muted">(optional)</span>
        </label>
        <input
          id="docs_url"
          name="docs_url"
          type="url"
          inputMode="url"
          defaultValue={submission?.docs_url ?? ""}
          placeholder="README, architecture notes, anything written"
          className={FIELD}
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="screenshots" className="text-sm font-medium">
          Screenshots <span className="text-muted">(one link per line, max 4)</span>
        </label>
        <textarea
          id="screenshots"
          name="screenshots"
          rows={3}
          defaultValue={(submission?.screenshots ?? []).join("\n")}
          placeholder={"https://drive.google.com/...\nhttps://drive.google.com/..."}
          className={FIELD}
        />
        <p className="text-xs text-muted">
          Paste links from Drive or your repo — don&rsquo;t upload here. Venue wifi
          on submission morning is not the place to push image files.
        </p>
      </div>

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

      <Buttons locked={locked} />
    </form>
  );
}
