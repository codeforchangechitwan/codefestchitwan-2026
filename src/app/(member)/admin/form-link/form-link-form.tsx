"use client";

import { useState, useTransition } from "react";
import { ArrowUpRight, Check, Loader2 } from "lucide-react";
import { saveFormLink } from "../actions";
import {
  FORM_LABEL_MAX,
  FORM_NOTE_MAX,
  FORM_URL_MAX,
  isFormUrl,
  type FormLinkSettings,
} from "@/lib/form-link";

/**
 * Edits the one external form button.
 *
 * The preview at the bottom is not decoration: the switch publishes to the
 * public homepage, so whoever presses Save should have already seen the exact
 * words a visitor will read.
 */
export function FormLinkForm({ settings }: { settings: FormLinkSettings }) {
  const [url, setUrl] = useState(settings.url);
  const [label, setLabel] = useState(settings.label);
  const [note, setNote] = useState(settings.note);
  const [enabled, setEnabled] = useState(settings.enabled);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const trimmedUrl = url.trim();
  const urlLooksWrong = trimmedUrl !== "" && !isFormUrl(trimmedUrl);

  function onSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await saveFormLink(formData);
      setFailed(!result.ok);
      setMessage(result.message);
    });
  }

  return (
    <form action={onSubmit} className="mt-6 grid gap-5">
      <div className="rounded-2xl border border-border bg-surface p-5 grid gap-4">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Form link</span>
          <input
            name="form_url"
            type="url"
            inputMode="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            maxLength={FORM_URL_MAX}
            placeholder="https://forms.gle/…"
            className="rounded-xl border border-border bg-surface px-4 py-2.5 font-mono text-xs outline-none focus:border-brand"
          />
          <span className="text-xs text-muted">
            In Google Forms: <strong>Send</strong> → the link tab → <strong>Copy</strong>.
            Either the short <code>forms.gle</code> link or the long{" "}
            <code>docs.google.com/forms/…</code> one works. Leave this empty to remove
            the button entirely.
          </span>
          {urlLooksWrong && (
            <span className="text-xs text-danger">
              Start it with <code>https://</code> and paste the whole link.
            </span>
          )}
        </label>

        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Button text</span>
          <input
            name="form_label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            maxLength={FORM_LABEL_MAX}
            placeholder="Register on the Google Form"
            className="rounded-xl border border-border bg-surface px-4 py-2.5 outline-none focus:border-brand"
          />
          <span className="text-xs text-muted">
            {label.trim().length}/{FORM_LABEL_MAX} characters. Say what the form is
            for — &ldquo;Register for Codefest&rdquo;, &ldquo;Give us feedback&rdquo;.
          </span>
        </label>

        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Note underneath (optional)</span>
          <textarea
            name="form_note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={FORM_NOTE_MAX}
            rows={2}
            placeholder="Closes 10 August. One entry per team."
            className="rounded-xl border border-border bg-surface px-4 py-2.5 outline-none focus:border-brand"
          />
          <span className="text-xs text-muted">
            {note.trim().length}/{FORM_NOTE_MAX} characters. A deadline or a caveat —
            the small print under the button.
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-xl border border-border bg-background/40 px-4 py-3 text-sm">
          <input
            name="form_enabled"
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
          />
          <span>
            <span className="font-medium">Show the button</span>
            <span className="mt-0.5 block text-xs text-muted">
              On means it appears on the public homepage and on every member&rsquo;s
              dashboard, immediately. Off means it is drawn nowhere at all — no
              greyed-out button, no placeholder.
            </span>
          </span>
        </label>
      </div>

      {/* Preview ---------------------------------------------------------- */}
      <div className="rounded-2xl border border-dashed border-border p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          What visitors will see
        </h2>
        {enabled && trimmedUrl && label.trim() ? (
          <div className="mt-3">
            <span className="inline-flex w-fit items-center gap-2.5 rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-accent/30">
              {label.trim()}
              <ArrowUpRight size={16} aria-hidden />
            </span>
            {note.trim() && (
              <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted/80">
                {note.trim()}
              </p>
            )}
            <p className="mt-3 break-all font-mono text-[11px] text-muted">
              → {trimmedUrl}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Nothing. {enabled ? "Add a link and button text." : "The button is switched off."}
          </p>
        )}
      </div>

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
          <span
            role="status"
            className={`text-sm ${failed ? "text-danger" : "text-success"}`}
          >
            {message}
          </span>
        )}
      </div>
    </form>
  );
}
