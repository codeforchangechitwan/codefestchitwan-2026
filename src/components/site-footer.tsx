import Link from "next/link";
import { Globe, Mail } from "lucide-react";
import { FacebookIcon, InstagramIcon } from "@/components/brand-icons";

const SOCIALS = [
  {
    href: "https://facebook.com/CodefestOfficial",
    label: "CodefestOfficial",
    icon: FacebookIcon,
  },
  {
    href: "https://instagram.com/codefest.official",
    label: "codefest.official",
    icon: InstagramIcon,
  },
  { href: "https://codefestnepal.com", label: "codefestnepal.com", icon: Globe },
  {
    href: "mailto:execution@codefestnepal.com",
    label: "execution@codefestnepal.com",
    icon: Mail,
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-muted">
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <p className="text-sm font-bold text-brand">Codefest 2026 — Chitwan</p>
        <p className="mt-1 text-sm text-muted">
          Forbes College, Bharatpur-2, Kshetrapur · Shrawan 29–31 (14–16 August 2026)
        </p>

        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {SOCIALS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-brand"
              >
                <Icon size={15} aria-hidden />
                {label}
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-4 text-xs text-muted">
          <span>Organised by Code for Change — let code lead the change.</span>
          <Link href="/schedule" className="hover:text-brand">
            Schedule
          </Link>
          <Link href="/partners" className="hover:text-brand">
            Partners
          </Link>
          <Link href="/login" className="hover:text-brand">
            Member login
          </Link>
        </div>
      </div>
    </footer>
  );
}
