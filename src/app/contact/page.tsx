import type { Metadata } from "next";
import { Globe, Mail, MapPin } from "lucide-react";
import { FacebookIcon, InstagramIcon } from "@/components/brand-icons";
import { EVENT } from "@/lib/event";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Codefest 2026 Chitwan organising team.",
};

const CHANNELS = [
  { icon: Mail, label: "Email", value: EVENT.email, href: `mailto:${EVENT.email}` },
  { icon: Globe, label: "Website", value: "codefestnepal.com", href: EVENT.website },
  { icon: FacebookIcon, label: "Facebook", value: "CodefestOfficial", href: EVENT.facebook },
  { icon: InstagramIcon, label: "Instagram", value: "codefest.official", href: EVENT.instagram },
];

export default function ContactPage() {
  return (
    <div className="relative min-h-screen py-10 px-4 max-w-4xl mx-auto">
      <div className="ambient-glow top-0 right-10 w-[400px] h-[250px] opacity-20" />

      <h1 className="text-3xl font-extrabold tracking-tight">Contact Team</h1>
      <p className="mt-1 text-xs sm:text-sm text-muted">
        Reach the Codefest 2026 Chitwan organizing team for registration & support.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* Left Column: Channels */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">Official Channels</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {CHANNELS.map(({ icon: Icon, label, value, href }) => (
              <a
                key={label}
                href={href}
                target={href.startsWith("mailto:") ? undefined : "_blank"}
                rel="noreferrer"
                className="glass-card p-4 border-glass hover-rise flex items-start gap-3"
              >
                <div className="h-10 w-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center shrink-0">
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</span>
                  <span className="block text-xs font-bold text-foreground truncate">{value}</span>
                </div>
              </a>
            ))}
          </div>

          <div className="glass-card p-5 border-glass mt-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <MapPin size={16} className="text-brand" /> On-the-Day Support Desk
            </h3>
            <p className="text-xs text-muted mt-2 leading-relaxed">
              During the hackathon, visit the Registration Desk in Building A for immediate identity card re-issuance and account resolution.
            </p>
          </div>
        </div>

        {/* Right Column: Contact Form */}
        <div className="glass-card p-6 border-glass">
          <h2 className="text-base font-bold text-foreground mb-4">Send a Support Request</h2>
          <ContactForm />
        </div>
      </div>
    </div>
  );
}

