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
} from "lucide-react";
import { Countdown } from "@/components/countdown";
import { EVENT } from "@/lib/event";
import { PARTNERS } from "@/lib/partners";
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
    body: "Every session from Friday 7:00 AM registration to the Sunday closing ceremony, with the zone for each slot.",
    href: "/schedule",
  },
  {
    icon: QrCode,
    title: "Digital identity card",
    body: "Your QR identity card lives in the app. The registration desk scans it to check you in.",
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
    body: "Buildings A, B and C at Forbes College — registration, food and the main hall.",
    href: "/venue",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero ------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-brand text-white">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/brand/chitwan-poster.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-right"
          />
        </div>
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-brand via-brand/95 to-brand-strong/80"
        />

        <div className="relative mx-auto w-full max-w-5xl px-4 py-12 sm:py-16">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            {EVENT.scope}
          </p>

          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Codefest 2026
            <span className="block text-accent">Chitwan Hackathon</span>
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
            {EVENT.tagline}. Three days of building at {EVENT.venue},{" "}
            {EVENT.address} — {EVENT.datesNepali} ({EVENT.datesEnglish}).
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:max-w-lg">
            <div className="rounded-xl bg-white/12 p-3 backdrop-blur">
              <dt className="text-[11px] uppercase tracking-wide text-white/70">
                Total prize pool
              </dt>
              <dd className="mt-0.5 text-lg font-bold">{EVENT.prizePool}</dd>
            </div>
            <div className="rounded-xl bg-white/12 p-3 backdrop-blur">
              <dt className="text-[11px] uppercase tracking-wide text-white/70">
                Dates
              </dt>
              <dd className="mt-0.5 text-lg font-bold">Aug 14–16</dd>
            </div>
          </dl>

          <div className="mt-6">
            <Countdown target={EVENT.startsAt} label="Registration desk opens in" />
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-brand transition-transform hover:scale-[1.02]"
            >
              Member login
              <ArrowRight size={16} aria-hidden />
            </Link>
            <Link
              href="/schedule"
              className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              View schedule
            </Link>
          </div>

          <p className="mt-5 text-xs text-white/70">
            {EVENT.eligibility}
          </p>
        </div>
      </section>

      {/* Closed system notice --------------------------------------------- */}
      <section className="border-b border-border bg-surface-muted">
        <div className="mx-auto w-full max-w-5xl px-4 py-5">
          <p className="text-sm leading-relaxed text-muted">
            <strong className="text-foreground">This is a closed system.</strong>{" "}
            Accounts are created only for people on the Codefest registration list —
            executive members, volunteers, mentors, judges, participants and invited
            guests. Your password is emailed to the address you registered with.
          </p>
        </div>
      </section>

      {/* Features ---------------------------------------------------------- */}
      <section className="mx-auto w-full max-w-5xl px-4 py-10">
        <h2 className="text-xl font-bold tracking-tight">What&rsquo;s in the app</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, body, href }) => (
            <Link
              key={title}
              href={href}
              className="group rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-brand/40"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon size={20} aria-hidden />
              </span>
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand">
                Open
                <ArrowRight
                  size={14}
                  aria-hidden
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Who's taking part -------------------------------------------------- */}
      <section className="border-y border-border bg-surface-muted">
        <div className="mx-auto w-full max-w-5xl px-4 py-10">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Users size={20} className="text-brand" aria-hidden />
            Who&rsquo;s taking part
          </h2>
          <p className="mt-1 text-sm text-muted">
            Every account belongs to one of these categories. Your category decides
            what you see once you sign in.
          </p>

          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map((role) => (
              <li
                key={role}
                className="rounded-2xl border border-border bg-surface p-4"
              >
                <p className="text-sm font-semibold text-brand">
                  {ROLE_LABELS[role]}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {ROLE_BLURBS[role]}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Prize + partners teaser -------------------------------------------- */}
      <section className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Trophy size={20} aria-hidden />
          </span>
          <h2 className="mt-3 text-xl font-bold tracking-tight">
            {EVENT.prizePool} total prize pool
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Registration closed {EVENT.registrationDeadline}. Winners are announced at
            the closing ceremony in the Main Hall on Sunday, 16 August.
          </p>
        </div>

        <div className="mt-8">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-bold tracking-tight">
              {PARTNERS.length} partners
            </h2>
            <Link
              href="/partners"
              className="text-sm font-medium text-brand hover:underline"
            >
              See all
            </Link>
          </div>
          <ul className="mt-4 flex flex-wrap gap-2">
            {PARTNERS.slice(0, 12).map((partner) => (
              <li
                key={partner.name}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted"
              >
                {partner.name}
              </li>
            ))}
            <li className="rounded-full bg-brand-soft px-3 py-1.5 text-xs font-medium text-brand">
              +{Math.max(PARTNERS.length - 12, 0)} more
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}
