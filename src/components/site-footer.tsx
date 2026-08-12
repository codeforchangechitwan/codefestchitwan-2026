import Link from "next/link";
import { Globe, Mail, MapPin, Calendar, Heart } from "lucide-react";
import { FacebookIcon, InstagramIcon } from "@/components/brand-icons";

const SOCIALS = [
  {
    href: "https://facebook.com/CodefestOfficial",
    label: "Facebook",
    handle: "@CodefestOfficial",
    icon: FacebookIcon,
  },
  {
    href: "https://instagram.com/codefest.official",
    label: "Instagram",
    handle: "@codefest.official",
    icon: InstagramIcon,
  },
  {
    href: "https://codefestnepal.com",
    label: "Website",
    handle: "codefestnepal.com",
    icon: Globe,
  },
  {
    href: "mailto:execution@codefestnepal.com",
    label: "Email",
    handle: "execution@codefestnepal.com",
    icon: Mail,
  },
];

const QUICK_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/schedule", label: "Schedule" },
  { href: "/venue", label: "Venue & Map" },
  { href: "/partners", label: "Partners" },
  { href: "/contact", label: "Contact Us" },
];

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-border-glass bg-surface/80 backdrop-blur-xl text-foreground">
      {/* Footer Ambient Radial Glow */}
      <div
        aria-hidden="true"
        className="ambient-glow -bottom-24 -left-24 w-96 h-96 bg-brand/10 blur-3xl pointer-events-none"
      />

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Brand Info & Mission */}
          <div className="space-y-4 lg:col-span-5">
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-brand via-accent to-gold-glow bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
                Codefest Chitwan 2026
              </span>
              <span className="rounded-full bg-brand/10 border border-brand/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">
                Hackathon
              </span>
            </div>

            <p className="text-sm text-muted leading-relaxed max-w-md">
              Empowering Nepal&rsquo;s next generation of tech innovators and problem solvers through an immersive 3-day hackathon experience.
            </p>

            <div className="space-y-2 text-xs text-muted">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-brand shrink-0" />
                <span>Forbes College, Bharatpur-2, Kshetrapur, Chitwan</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-accent shrink-0" />
                <span>Shrawan 29–31 (14–16 August 2026)</span>
              </div>
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="space-y-3 lg:col-span-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Quick Links
            </h3>
            <ul className="grid grid-cols-2 gap-2 text-sm">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted transition-colors hover:text-brand hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Socials & Connect Column */}
          <div className="space-y-3 lg:col-span-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Connect With Us
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SOCIALS.map(({ href, label, handle, icon: Icon }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="hover-rise flex items-center gap-2.5 rounded-xl border border-glass bg-surface-glass/60 p-2.5 text-xs text-muted transition-all duration-200 hover:border-brand/40 hover:bg-surface-glass-hover hover:text-foreground hover:shadow-[0_0_15px_rgb(var(--brand-rgb)/0.2)]"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <Icon size={15} aria-hidden />
                  </div>
                  <div className="truncate">
                    <p className="font-semibold text-foreground leading-none">{label}</p>
                    <p className="text-[10px] text-muted truncate">{handle}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar & Copyright */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border-glass pt-6 text-xs text-muted sm:flex-row">
          <div className="flex items-center gap-1.5">
            <span>Organised with</span>
            <Heart size={13} className="fill-danger text-danger" />
            <span>by <strong className="text-foreground">Code for Change</strong> — Let code lead the change.</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/schedule" className="hover:text-brand transition-colors">
              Schedule
            </Link>
            <span>·</span>
            <Link href="/partners" className="hover:text-brand transition-colors">
              Partners
            </Link>
            <span>·</span>
            <Link href="/login" className="hover:text-brand transition-colors">
              Member Portal
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
