import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Gamepad2,
  MapPin,
  QrCode,
  Trophy,
  Users,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Countdown } from "@/components/countdown";
import { FormLinkButton } from "@/components/form-link-button";
import {
  PublicHackClock,
  type PublicHackState,
} from "@/components/public-hack-clock";
import { createClient } from "@/lib/supabase/server";
import { EVENT } from "@/lib/event";
import { ANNOUNCED_PARTNERS, PARTNERS } from "@/lib/partners";
import { ROLES, ROLE_LABELS } from "@/lib/types";

const ROLE_BLURBS: Record<string, string> = {
  executive: "Run the event — manage members, announcements, quizzes and check-in.",
  volunteer: "Keep the floor moving and scan identity cards at the desk.",
  mentor: "Guide teams through the online mentor sessions on Friday and Saturday.",
  judge: "Score the Sunday presentations in the Main Hall.",
  participant: "Build for 48 hours, play the quizzes, present on Sunday.",
  other: "Guests, press and partners attending across the three days.",
};

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Live schedule",
    body: "Every session from Friday 7:00 AM registration to Sunday closing ceremony, with zones for each slot.",
    href: "/schedule",
  },
  {
    icon: QrCode,
    title: "Digital identity card",
    body: "Your QR identity card lives in the app. The registration desk scans it for instant check-in.",
    href: "/id-card",
  },
  {
    icon: Gamepad2,
    title: "Quizzes & games",
    body: "Timed quizzes during the event with a live leaderboard — including the Saturday evening quiz slot.",
    href: "/quiz",
  },
  {
    icon: MapPin,
    title: "Venue map",
    body: "Buildings A, B and C at Forbes College — registration, fooding and the main hall.",
    href: "/venue",
  },
];

export default async function HomePage() {
  /*
   * The live hackathon clock, read through hackathon_public() — the one
   * hackathon read granted to `anon`, deliberately narrower than the members'
   * one. Server-rendered so the countdown is right in the HTML for a visitor
   * with JavaScript off, and for anything that scrapes the page.
   *
   * Failure here must never take the marketing page down, so a bad read just
   * falls back to the pre-event countdown.
   */
  let hack: PublicHackState = {
    status: "idle",
    endsAt: null,
    coordinatorName: null,
    skewMs: 0,
  };
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("hackathon_public");
    const row = Array.isArray(data) ? data[0] : null;
    if (row) {
      hack = {
        status: row.status,
        endsAt: row.ends_at,
        coordinatorName: row.coordinator_name,
        skewMs: 0,
      };
    }
  } catch {
    // Keep the fallback.
  }

  return (
    <div className="relative overflow-hidden">
      {/* Background Ambient Radial Glows */}
      <div className="ambient-glow top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] opacity-30 animate-pulse-glow" />
      <div className="ambient-glow top-[600px] right-0 w-[400px] h-[300px] opacity-20" />

      {/* Hero Section */}
      <section className="relative px-4 pt-12 pb-16 sm:pt-20 sm:pb-24 max-w-5xl mx-auto">
        <div className="glass-card relative overflow-hidden p-6 sm:p-12 border border-glass bg-surface-glass backdrop-blur-2xl shadow-2xl">
          {/* Subtle Banner Backdrop */}
          <div className="absolute inset-0 opacity-15 pointer-events-none">
            <Image
              src="/brand/chitwan-poster.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-center filter blur-xs"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-surface-glass/80 to-transparent" />
          </div>

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand-soft px-3.5 py-1 text-xs font-bold text-brand backdrop-blur-md">
              <Sparkles size={14} className="animate-spin" />
              {EVENT.scope}
            </div>

            <h1 className="mt-4 text-4xl sm:text-6xl font-black tracking-tight leading-tight">
              Codefest 2026{" "}
              <span className="bg-gradient-to-r from-brand via-accent to-gold-glow bg-clip-text text-transparent block">
                Chitwan Hackathon
              </span>
            </h1>

            <p className="mt-4 text-base sm:text-lg text-muted/90 leading-relaxed font-normal">
              <span className="font-semibold text-foreground">{EVENT.positioning}</span>{" "}
              — {EVENT.tagline}. Three days of high-octane building at {EVENT.venue},{" "}
              {EVENT.address} — {EVENT.datesNepali} ({EVENT.datesEnglish}).
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4 max-w-md">
              <div className="glass-card p-3.5 border-glass bg-surface/40 backdrop-blur-md">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-muted">
                  Total Prize Pool
                </p>
                <p className="mt-1 text-xl sm:text-2xl font-black text-foreground">
                  {EVENT.prizePool}
                </p>
              </div>
              <div className="glass-card p-3.5 border-glass bg-surface/40 backdrop-blur-md">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-muted">
                  Event Dates
                </p>
                <p className="mt-1 text-xl sm:text-2xl font-black text-foreground">
                  Aug 14–16
                </p>
              </div>
            </div>

            <div className="mt-8">
              <PublicHackClock
                initial={hack}
                fallback={
                  <Countdown
                    target={EVENT.startsAt}
                    label="Registration desk opens in"
                  />
                }
              />
            </div>

            <div className="mt-8 flex flex-wrap items-start gap-4">
              {/* Renders nothing until an executive switches it on in
                  /admin/form-link, so the row degrades to the two links
                  below. */}
              <FormLinkButton variant="hero" />
              <Link
                href="/login"
                className="btn-primary-glass inline-flex items-center gap-2.5 px-6 py-3.5 text-sm font-bold shadow-lg"
              >
                Member login
                <ArrowRight size={16} aria-hidden />
              </Link>
              <Link
                href="/schedule"
                className="inline-flex items-center gap-2.5 rounded-xl border border-white/15 bg-surface-glass px-6 py-3.5 text-sm font-semibold text-foreground backdrop-blur-md hover:bg-surface-glass-hover hover:border-white/25 transition-all"
              >
                View schedule
              </Link>
            </div>

            <p className="mt-5 text-xs text-muted/80 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-glow" />
              {EVENT.eligibility}
            </p>
          </div>
        </div>
      </section>

      {/* Closed System Notice */}
      <section className="px-4 max-w-5xl mx-auto mb-12">
        <div className="glass-card p-4 sm:p-5 border-brand/20 bg-brand-soft/10 flex items-start gap-3.5">
          <ShieldCheck size={20} className="text-brand shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-muted leading-relaxed">
            <strong className="text-foreground font-semibold">Closed Registration System:</strong>{" "}
            This is a closed system. Accounts are created exclusively for registered participants, executives, volunteers, mentors, judges, and invited guests. Your password is emailed directly to your registered address.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 py-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">App Experience</h2>
            <p className="text-xs text-muted mt-1">Key portals available during the 3-day hackathon</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body, href }) => (
            <Link
              key={title}
              href={href}
              className="glass-card p-5 group hover-rise transition-all duration-300 border-glass hover:border-brand/40 flex flex-col justify-between"
            >
              <div>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand group-hover:scale-110 transition-transform">
                  <Icon size={22} aria-hidden />
                </span>
                <h3 className="mt-4 font-bold text-base text-foreground">{title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted/90">{body}</p>
              </div>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand">
                Explore feature
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Role Categories */}
      <section className="px-4 py-12 max-w-5xl mx-auto">
        <div className="glass-card p-6 sm:p-8 border-glass">
          <div className="flex items-center gap-2.5 mb-2">
            <Users size={22} className="text-brand" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Participant Roles & Access</h2>
          </div>
          <p className="text-xs sm:text-sm text-muted mb-6">
            Your assigned role determines accessible portals, check-in privileges, and quiz modules.
          </p>

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map((role) => (
              <li
                key={role}
                className="glass-card p-4 border-white/5 bg-surface/40 hover:border-brand/30 transition-colors"
              >
                <span className="text-xs font-extrabold uppercase tracking-wider text-brand bg-brand-soft px-2.5 py-1 rounded-md inline-block mb-2">
                  {ROLE_LABELS[role]}
                </span>
                <p className="text-xs text-muted leading-relaxed">
                  {ROLE_BLURBS[role]}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Prize & Partners Summary */}
      <section className="px-4 py-8 max-w-5xl mx-auto mb-16">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="glass-card p-6 border-accent/30 bg-accent-soft/20 lg:col-span-1 flex flex-col justify-between">
            <div>
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20 text-accent mb-4">
                <Trophy size={24} />
              </span>
              <h3 className="text-xl font-bold">{EVENT.prizePool} Prize Pool</h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                Registration closed {EVENT.registrationDeadline}. Winners announced Sunday afternoon in the Main Hall.
              </p>
            </div>
          </div>

          <div className="glass-card p-6 border-glass lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{PARTNERS.length} Event Partners</h3>
              <Link href="/partners" className="text-xs font-semibold text-brand hover:underline">
                View all partner details →
              </Link>
            </div>
            {/* The officially announced tiers, rather than the first N of the
                array — so a reordering cannot quietly promote an unconfirmed
                name onto the front page. */}
            <ul className="flex flex-wrap gap-2">
              {ANNOUNCED_PARTNERS.map((partner) => (
                <li
                  key={partner.name}
                  className="rounded-lg border border-glass bg-surface/50 px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:border-white/20 transition-colors"
                >
                  {partner.name}
                </li>
              ))}
              <li className="rounded-lg bg-brand-soft border border-brand/20 px-3 py-1.5 text-xs font-semibold text-brand">
                +{Math.max(PARTNERS.length - ANNOUNCED_PARTNERS.length, 0)} more
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

