/**
 * Shared contact-form vocabulary.
 *
 * Lives outside `lib/mail.ts` because that module is `server-only` and the
 * public contact form is a client component — both sides need these labels.
 */

export const CONTACT_SUBJECTS = {
  account: "Account & password issue",
  schedule: "Schedule / session query",
  venue: "Venue & logistics",
  other: "General inquiry",
} as const;

export type ContactSubject = keyof typeof CONTACT_SUBJECTS;

export function isContactSubject(value: unknown): value is ContactSubject {
  return typeof value === "string" && value in CONTACT_SUBJECTS;
}
