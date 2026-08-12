"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import { CONTACT_SUBJECTS } from "@/lib/contact";
import { submitContactForm, type ContactState } from "@/app/contact/actions";

const FIELD_CLASS =
  "w-full rounded-xl border border-glass bg-surface/60 px-4 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand/30";

const LABEL_CLASS =
  "block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-danger">
      <AlertCircle size={12} className="shrink-0" />
      {message}
    </p>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary-glass w-full py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-60"
    >
      {pending ? (
        "Sending Message..."
      ) : (
        <>
          Send Support Request <Send size={14} />
        </>
      )}
    </button>
  );
}

export function ContactForm() {
  const [state, formAction] = useActionState<ContactState, FormData>(
    submitContactForm,
    { status: "idle" },
  );

  if (state.status === "sent") {
    return (
      <div className="glass-card p-6 border-emerald-glow/30 bg-emerald-glow/10 text-center">
        <CheckCircle2 size={32} className="text-emerald-glow mx-auto mb-2" />
        <h3 className="font-bold text-base text-foreground">Message sent</h3>
        <p className="text-xs text-muted mt-1">
          Our organising team will reply to the email address you gave us.
        </p>
      </div>
    );
  }

  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.status === "error" && !state.fieldErrors && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-xs text-danger"
        >
          <AlertCircle size={14} className="mt-px shrink-0" />
          {state.message}
        </p>
      )}

      <div>
        <label htmlFor="contact-name" className={LABEL_CLASS}>
          Your Name
        </label>
        <input
          id="contact-name"
          name="fullName"
          type="text"
          required
          maxLength={120}
          autoComplete="name"
          aria-invalid={Boolean(fieldErrors.fullName)}
          placeholder="Participant or Guest name"
          className={FIELD_CLASS}
        />
        <FieldError message={fieldErrors.fullName} />
      </div>

      <div>
        <label htmlFor="contact-email" className={LABEL_CLASS}>
          Registered Email Address
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          aria-invalid={Boolean(fieldErrors.email)}
          placeholder="you@example.com"
          className={FIELD_CLASS}
        />
        <FieldError message={fieldErrors.email} />
      </div>

      <div>
        <label htmlFor="contact-subject" className={LABEL_CLASS}>
          Message Subject
        </label>
        <select
          id="contact-subject"
          name="subject"
          defaultValue="account"
          aria-invalid={Boolean(fieldErrors.subject)}
          className={FIELD_CLASS}
        >
          {Object.entries(CONTACT_SUBJECTS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <FieldError message={fieldErrors.subject} />
      </div>

      <div>
        <label htmlFor="contact-message" className={LABEL_CLASS}>
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={4}
          required
          maxLength={4000}
          aria-invalid={Boolean(fieldErrors.message)}
          placeholder="Describe your issue or question..."
          className={FIELD_CLASS}
        />
        <FieldError message={fieldErrors.message} />
      </div>

      <SubmitButton />
    </form>
  );
}
