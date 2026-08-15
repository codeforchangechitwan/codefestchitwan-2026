"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Save, Send } from "lucide-react";
import { ROLES, ROLE_LABELS, type Announcement } from "@/lib/types";
import {
  postAnnouncement,
  updateAnnouncement,
  type AnnouncementResult,
} from "../actions";

const FIELD =
  "rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/25";

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  const Icon = editing ? Save : Send;

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:opacity-60 ${
        editing ? "flex-1" : "w-full"
      }`}
    >
      {pending ? (
        <Loader2 size={16} className="animate-spin" aria-hidden />
      ) : (
        <Icon size={16} aria-hidden />
      )}
      {editing ? "Save changes" : "Post announcement"}
    </button>
  );
}

/**
 * The one announcement form, used both to post a new notice and to edit a
 * posted one.
 *
 * Editing binds the row id into the Server Action rather than carrying it in
 * a hidden field, so the id a browser can tamper with never decides which row
 * is written — and the same validation runs for both paths.
 */
export function AnnouncementForm({
  announcement,
  onSaved,
  onCancel,
}: {
  /** Present when editing an existing notice; absent when posting a new one. */
  announcement?: Announcement;
  /** Called after a successful save, so the row can leave edit mode. */
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const editing = announcement !== undefined;
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction] = useActionState<AnnouncementResult | null, FormData>(
    editing ? updateAnnouncement.bind(null, announcement.id) : postAnnouncement,
    null,
  );

  useEffect(() => {
    if (!state?.ok) return;
    // A posted notice clears the form so the next one starts blank; an edited
    // one hands control back to the list, which is already showing the saved
    // text by the time the revalidation lands.
    if (editing) onSaved?.();
    else formRef.current?.reset();
  }, [state, editing, onSaved]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4">
      <div className="grid gap-1.5">
        <label htmlFor={`title-${announcement?.id ?? "new"}`} className="text-sm font-medium">
          Title
        </label>
        <input
          id={`title-${announcement?.id ?? "new"}`}
          name="title"
          required
          defaultValue={announcement?.title ?? ""}
          className={FIELD}
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor={`body-${announcement?.id ?? "new"}`} className="text-sm font-medium">
          Message
        </label>
        <textarea
          id={`body-${announcement?.id ?? "new"}`}
          name="body"
          required
          rows={editing ? 8 : 5}
          defaultValue={announcement?.body ?? ""}
          className={FIELD}
        />
        <p className="text-xs text-muted">
          Blank lines are kept as paragraphs, and any https:// link becomes a
          tappable link.
        </p>
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
                defaultChecked={announcement?.audience?.includes(role) ?? false}
                className="accent-[var(--brand)]"
              />
              {ROLE_LABELS[role]}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="urgent"
          defaultChecked={announcement?.urgent ?? false}
          className="accent-[var(--danger)]"
        />
        Mark as urgent
      </label>

      {state && !state.ok && (
        <p
          role="status"
          className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {state.message}
        </p>
      )}
      {state?.ok && !editing && (
        <p
          role="status"
          className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
        >
          {state.message}
        </p>
      )}

      <div className={editing ? "flex flex-wrap gap-2" : undefined}>
        <SubmitButton editing={editing} />
        {editing && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-border px-4 py-3 text-sm font-semibold"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
