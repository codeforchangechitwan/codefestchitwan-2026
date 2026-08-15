/**
 * The admin-editable button that sends people to an external form — in
 * practice a Google Form (https://forms.gle/…), which is where the organisers
 * actually collect registrations and feedback.
 *
 * Deliberately free of any `next/headers` import so the admin's client-side
 * form can share these limits and the URL check with the Server Action that
 * enforces them. The Supabase client is passed IN rather than constructed
 * here for the same reason — see readFormLink below.
 */

/** Mirrors the CHECK constraints in 20260816090000_form_link.sql. */
export const FORM_LABEL_MAX = 60;
export const FORM_NOTE_MAX = 200;
export const FORM_URL_MAX = 500;

/** A live, switched-on link. Absent entirely when the button is off. */
export type FormLink = {
  /** The words on the button. */
  label: string;
  url: string;
  /** One line under the button, or null. */
  note: string | null;
};

/** Everything the admin screen edits, including the off state. */
export type FormLinkSettings = {
  url: string;
  label: string;
  note: string;
  enabled: boolean;
};

/**
 * The same shape the database enforces. Checked in the Server Action too, so
 * a typo comes back as a sentence rather than as a constraint violation.
 */
export function isFormUrl(value: string) {
  return /^https?:\/\/\S+$/i.test(value) && value.length <= FORM_URL_MAX;
}

/**
 * Only the fields `public_form_link()` returns — a structural type rather than
 * an import of SupabaseClient, which would drag @supabase/supabase-js's
 * generics (and their version drift) into a module the browser bundles.
 */
type RpcClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: unknown }>;
};

/**
 * Reads the button through `public_form_link()`, the one form read granted to
 * `anon` — the homepage shows this to visitors who are not signed in.
 *
 * Returns null when the button is off, when the URL was never set, and when
 * the read fails. A dead database must not take the marketing page down over
 * a call-to-action, so every failure mode collapses to "draw nothing".
 */
export async function readFormLink(
  supabase: RpcClient,
): Promise<FormLink | null> {
  try {
    const { data, error } = await supabase.rpc("public_form_link");
    if (error) return null;

    const row = Array.isArray(data) ? (data[0] as Record<string, unknown>) : null;
    const url = typeof row?.url === "string" ? row.url : null;
    if (!url) return null;

    const label = typeof row?.label === "string" ? row.label.trim() : "";
    const note = typeof row?.note === "string" ? row.note.trim() : "";

    return {
      label: label || "Open the form",
      url,
      note: note || null,
    };
  } catch {
    return null;
  }
}
