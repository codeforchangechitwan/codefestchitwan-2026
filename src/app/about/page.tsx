import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Shield, Trophy, Users, Sparkles } from "lucide-react";
import { EVENT } from "@/lib/event";
import { ROLES, ROLE_LABELS } from "@/lib/types";

export const metadata: Metadata = {
  title: "About",
  description:
    "About Codefest 2026 Chitwan — a Code for Change hackathon at Forbes College, 14–16 August 2026.",
};

const HIGHLIGHTS = [
  `${EVENT.prizePool} total prize pool across multiple competition tracks`,
  "48 hours of non-stop building, from Friday morning to Sunday afternoon",
  "Online & in-person mentor sessions on Friday evening and Saturday midday",
  "Interactive quizzes and mini-games with live leaderboard rankings",
  "Project pitches and final judging in the Main Hall on Sunday",
];

const ORGANIZERS = [
  { name: "Code for Change Team", role: "Organizer", bio: "Leading tech initiatives across all 7 provinces." },
  { name: "Forbes College Faculty", role: "Host Institution", bio: "Providing state-of-the-art labs and main hall facilities." },
  { name: "Executive Committee", role: "Event Management", bio: "Coordinating schedules, logistics, and participant support." },
];

export default function AboutPage() {
  return (
    <div className="relative min-h-screen py-12 px-4 max-w-4xl mx-auto">
      {/* Background Glow */}
      <div className="ambient-glow top-10 left-1/2 -translate-x-1/2 w-[500px] h-[300px] opacity-25" />

      {/* Header / Hero */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand-soft px-3 py-1 text-xs font-bold text-brand mb-3">
          <Sparkles size={12} />
          About Codefest 2026
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
          Transforming Ideas Into Reality
        </h1>
        <p className="mt-3 text-sm sm:text-base text-muted leading-relaxed">
          Organized by <strong className="text-foreground font-semibold">Code for Change</strong> — {EVENT.organiserTagline}. The 2026 edition spans all 7 provinces of Nepal, hosted locally at {EVENT.venue} in {EVENT.address}.
        </p>
      </div>

      {/* Banner Card */}
      <div className="glass-card overflow-hidden border-glass p-2 shadow-2xl mb-12">
        <Image
          src="/brand/codefest-banner.jpg"
          alt="Codefest 2026 — Transforming ideas into reality"
          width={960}
          height={425}
          className="h-auto w-full rounded-xl object-cover"
          priority
        />
      </div>

      {/* Highlights Section */}
      <section className="glass-card p-6 sm:p-8 border-glass mb-10">
        <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
          <Trophy size={20} className="text-brand" />
          Event Highlights & Mechanics
        </h2>
        <ul className="mt-4 space-y-3">
          {HIGHLIGHTS.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm leading-relaxed">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-glow" />
              <span className="text-muted/90">{item}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 pt-4 border-t border-border/50">
          <Link
            href="/schedule"
            className="text-xs font-bold uppercase tracking-wider text-brand hover:underline inline-flex items-center gap-1"
          >
            Explore Full Event Timeline →
          </Link>
        </div>
      </section>

      {/* Speaker & Organizer Grids */}
      <section className="mb-10">
        <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
          <Users size={20} className="text-brand" />
          Organizers & Committee
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {ORGANIZERS.map((org) => (
            <div key={org.name} className="glass-card p-4 border-glass">
              <div className="h-10 w-10 rounded-full bg-brand-soft border border-brand/30 flex items-center justify-center font-bold text-brand text-sm mb-3">
                {org.name[0]}
              </div>
              <h3 className="font-bold text-sm text-foreground">{org.name}</h3>
              <p className="text-[11px] font-semibold text-brand mt-0.5">{org.role}</p>
              <p className="text-xs text-muted mt-2 leading-relaxed">{org.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Participant Categories */}
      <section className="glass-card p-6 sm:p-8 border-glass mb-10">
        <h2 className="text-xl font-bold tracking-tight mb-2">Access Categories</h2>
        <p className="text-xs text-muted mb-4">
          Every participant, mentor, judge, and volunteer is assigned an explicit system category.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {ROLES.map((role) => (
            <div key={role} className="glass-card p-3.5 border-white/5 bg-surface/30 flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-brand" />
              <span className="text-xs font-semibold text-foreground">{ROLE_LABELS[role]}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Account Provisioning Card */}
      <section className="glass-card p-6 border-brand/30 bg-brand-soft/20 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2 justify-center sm:justify-start">
            <Shield size={18} className="text-brand" />
            Account Information
          </h2>
          <p className="mt-1 text-xs text-muted leading-relaxed max-w-xl">
            Accounts are provisioned automatically from the registration roster. Check your email for login credentials or visit Building A Desk for assistance.
          </p>
        </div>
        <Link
          href="/login"
          className="btn-primary-glass px-5 py-2.5 text-xs font-bold whitespace-nowrap"
        >
          Sign In To Portal
        </Link>
      </section>
    </div>
  );
}

