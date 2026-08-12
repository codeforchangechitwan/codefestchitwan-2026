"use server";

import { isContactSubject } from "@/lib/contact";
import { EVENT } from "@/lib/event";
import { sendContactEmail } from "@/lib/mail";

export type ContactState =
  | { status: "idle" }
  | { status: "sent" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

const MAX_MESSAGE = 4000;
const MAX_NAME = 120;

// Deliberately permissive: the address is validated for shape only, since the
// real check is whether the team's reply reaches it.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitContactForm(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const subject = String(formData.get("subject") ?? "");
  const message = String(formData.get("message") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  if (!fullName) fieldErrors.fullName = "Please tell us your name.";
  else if (fullName.length > MAX_NAME) fieldErrors.fullName = "That name is too long.";

  if (!email) fieldErrors.email = "Please give us an email address to reply to.";
  else if (!EMAIL_RE.test(email)) fieldErrors.email = "That does not look like an email address.";

  if (!isContactSubject(subject)) fieldErrors.subject = "Please choose a subject.";

  if (!message) fieldErrors.message = "Please describe your question.";
  else if (message.length > MAX_MESSAGE) {
    fieldErrors.message = `Please keep it under ${MAX_MESSAGE} characters.`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors };
  }

  // `isContactSubject` above already narrowed this, but the guard ran inside
  // the error-collecting block so TypeScript needs it restated.
  if (!isContactSubject(subject)) {
    return { status: "error", message: "Please choose a subject." };
  }

  const result = await sendContactEmail({ fullName, email, subject, message });

  if (!result.sent) {
    // Never claim delivery we cannot back up — hand over the direct address so
    // the enquiry is not simply lost.
    console.error("Contact form send failed:", result.reason);
    return {
      status: "error",
      message: `We could not send that just now. Please email us directly at ${EVENT.email}.`,
    };
  }

  return { status: "sent" };
}
