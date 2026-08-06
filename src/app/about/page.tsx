import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Trophy, Users } from "lucide-react";
import { EVENT } from "@/lib/event";
import { ROLES, ROLE_LABELS } from "@/lib/types";

export const metadata: Metadata = {
  title: "About",
  description:
    "About Codefest 2026 Chitwan — a Code for Change hackathon at Forbes College, 14–16 August 2026.",
};

const HIGHLIGHTS = [
  `${EVENT.prizePool} total prize pool`,
  "48 hours of building, from Friday morning to Sunday afternoon",
  "Online mentor sessions on Friday evening and Saturday midday",
  "Quiz and games with a live leaderboard",
  "Presentations and judging in the Main Hall on Sunday",
];

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">About Codefest 2026</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Codefest is organised by <strong className="text-foreground">Code for Change</strong> —{" "}
        {EVENT.organiserTagline}. The 2026 edition runs across all seven provinces of
        Nepal, and this is the Chitwan chapter, hosted at {EVENT.venue} in{" "}
        {EVENT.address}.
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border">
        <Image
          src="/brand/codefest-banner.jpg"
          alt="Codefest 2026 — Transforming ideas into reality. Happening in all 7 provinces."
          width={960}
          height={425}
          className="h-auto w-full"
        />
      </div>

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Trophy size={18} className="text-brand" aria-hidden />
          What happens over three days
        </h2>
        <ul className="mt-3 grid gap-2">
          {HIGHLIGHTS.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm leading-relaxed">
              <CheckCircle2
                size={16}
                className="mt-0.5 shrink-0 text-brand"
                aria-hidden
              />
              <span className="text-muted">{item}</span>
            </li>
          ))}
        </ul>
        <Link
          href="/schedule"
          className="mt-4 inline-block text-sm font-medium text-brand hover:underline"
        >
          See the full timeline →
        </Link>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">Who can participate</h2>
        <p className="mt-2 rounded-xl border border-border bg-surface-muted p-4 text-sm leading-relaxed text-muted">
          {EVENT.eligibility} Registration closed on {EVENT.registrationDeadline}.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Users size={18} className="text-brand" aria-hidden />
          Categories on this site
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Everyone involved in Codefest Chitwan has an account in one of six
          categories. Access to schedules, the identity card, quizzes and the admin
          tools follows from your category.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {ROLES.map((role) => (
            <li
              key={role}
              className="rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium"
            >
              {ROLE_LABELS[role]}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-lg font-bold">Getting your account</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          There is no public sign-up. The Codefest team creates an account for every
          registered person and emails the password to the address on the registration
          form. Sign in, set your own password, and your digital identity card is ready
          to be scanned at the Registration Desk in Building A.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong"
        >
          Member login
        </Link>
      </section>
    </div>
  );
}
