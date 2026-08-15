import { ArrowUpRight, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { readFormLink, type FormLink } from "@/lib/form-link";

/**
 * The admin-editable link out to the Google Form.
 *
 * An async Server Component that does its own read, so a page adds the button
 * by dropping in one tag. It renders NOTHING when the button is switched off
 * in /admin/form-link — no disabled state, no "coming soon" — because a
 * greyed-out button on the public homepage only generates questions at the
 * desk.
 *
 * `target="_blank"` on purpose: someone filling a Google Form on a phone at
 * the venue must not lose the schedule tab they were reading. `rel` carries
 * noopener/noreferrer because the destination is a URL an executive typed in
 * and the app should not hand it a window handle.
 */
export async function FormLinkButton({
  variant = "hero",
}: {
  /** "hero" is the standalone CTA; "card" sits inside a bordered panel. */
  variant?: "hero" | "card";
}) {
  let link: FormLink | null = null;
  try {
    link = await readFormLink(await createClient());
  } catch {
    // Supabase unconfigured or unreachable — draw nothing.
  }
  if (!link) return null;

  return variant === "hero" ? <HeroButton link={link} /> : <CardButton link={link} />;
}

/*
 * Solid accent rather than `btn-primary-glass`, which "Member login" already
 * wears. Two identical gradient buttons side by side in the hero read as one
 * mistake; a filled accent next to a gradient reads as two choices.
 */
function HeroButton({ link }: { link: FormLink }) {
  return (
    <div className="flex flex-col gap-2">
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-fit items-center gap-2.5 rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-accent/30 transition-all hover:-translate-y-0.5 hover:brightness-110"
      >
        {link.label}
        <ArrowUpRight size={16} aria-hidden />
      </a>
      {link.note && (
        <p className="text-xs text-muted/80 max-w-xs leading-relaxed">{link.note}</p>
      )}
    </div>
  );
}

function CardButton({ link }: { link: FormLink }) {
  return (
    <div className="rounded-2xl border border-brand/25 bg-brand-soft/40 p-4">
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong"
      >
        <ExternalLink size={15} aria-hidden />
        {link.label}
      </a>
      {link.note && (
        <p className="mt-2.5 text-xs leading-relaxed text-muted">{link.note}</p>
      )}
    </div>
  );
}
