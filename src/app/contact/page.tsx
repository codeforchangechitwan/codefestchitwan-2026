import type { Metadata } from "next";
import { Globe, Mail, MapPin } from "lucide-react";
import { FacebookIcon, InstagramIcon } from "@/components/brand-icons";
import { EVENT } from "@/lib/event";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Codefest 2026 Chitwan organising team.",
};

const CHANNELS = [
  {
    icon: Mail,
    label: "Email",
    value: EVENT.email,
    href: `mailto:${EVENT.email}`,
  },
  { icon: Globe, label: "Website", value: "codefestnepal.com", href: EVENT.website },
  {
    icon: FacebookIcon,
    label: "Facebook",
    value: "CodefestOfficial",
    href: EVENT.facebook,
  },
  {
    icon: InstagramIcon,
    label: "Instagram",
    value: "codefest.official",
    href: EVENT.instagram,
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Contact</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Questions about registration, your account, or the schedule? Reach the
        organising team here.
      </p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {CHANNELS.map(({ icon: Icon, label, value, href }) => (
          <li key={label}>
            <a
              href={href}
              target={href.startsWith("mailto:") ? undefined : "_blank"}
              rel="noreferrer"
              className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-brand/40"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon size={18} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-xs uppercase tracking-wide text-muted">
                  {label}
                </span>
                <span className="block truncate text-sm font-medium">{value}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>

      <section className="mt-8 rounded-2xl border border-border bg-surface p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <MapPin size={18} className="text-brand" aria-hidden />
          On the day
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          During the event, the fastest route to a human is the Registration Desk in
          Building A. Volunteers there can look up your account, re-issue your identity
          card and check you in.
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-surface-muted p-5">
        <h2 className="text-lg font-bold">Trouble signing in?</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Accounts exist only for people on the registration list. If you registered
          but never received your password, check your spam folder first, then email{" "}
          <a
            href={`mailto:${EVENT.email}`}
            className="font-medium text-brand underline underline-offset-2"
          >
            {EVENT.email}
          </a>{" "}
          from the address you registered with.
        </p>
      </section>
    </div>
  );
}
