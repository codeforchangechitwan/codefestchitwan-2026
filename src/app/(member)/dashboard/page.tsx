import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  CalendarClock,
  Gamepad2,
  QrCode,
  Shield,
  Trophy,
} from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSchedule } from "@/lib/schedule";
import { EVENT } from "@/lib/event";
import { ROLE_LABELS } from "@/lib/types";
import type { Announcement, ScheduleEvent } from "@/lib/types";

export const metadata: Metadata = { title: "Dashboard" };

/** The session happening now, and the one after it. */
function findCurrentAndNext(events: ScheduleEvent[], now: number) {
  const timed = events.filter((event) => event.starts_at);
  const current =
    timed.find((event) => {
      const start = new Date(event.starts_at!).getTime();
      const end = event.ends_at ? new Date(event.ends_at).getTime() : start;
      return now >= start && now < end;
    }) ?? null;

  const next =
    timed.find((event) => new Date(event.starts_at!).getTime() > now) ?? null;

  return { current, next };
}

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const { profile } = await requireMember();
  const params = await props.searchParams;
  const welcomed = params.welcome === "1";
  const forbidden = params.error === "forbidden";

  const { events } = await getSchedule();
  // Force-dynamic page: reading the clock per request is the point.
  const { current, next } = findCurrentAndNext(events, new Date().getTime());

  const supabase = await createClient();
  const { data: announcementRows } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(3);
  const announcements = (announcementRows ?? []) as Announcement[];

  const isExecutive = profile.role === "executive";
  const isDeskStaff = isExecutive || profile.role === "volunteer";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      {welcomed && (
        <p className="mb-4 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          Password saved. Welcome to Codefest Chitwan 2026.
        </p>
      )}
      {forbidden && (
        <p className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          That area is limited to organising staff.
        </p>
      )}

      <header>
        <p className="text-sm text-muted">Namaste,</p>
        <h1 className="text-2xl font-bold tracking-tight">{profile.full_name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
            {ROLE_LABELS[profile.role]}
          </span>
          {profile.team_name && (
            <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted">
              {profile.team_name}
            </span>
          )}
          {profile.checked_in_at && (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
              <BadgeCheck size={12} aria-hidden />
              Checked in
            </span>
          )}
        </div>
      </header>

      {/* Now / next ------------------------------------------------------ */}
      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-accent/30 bg-accent-soft p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-accent">
            Happening now
          </p>
          {current ? (
            <>
              <p className="mt-1 font-semibold leading-snug">{current.title}</p>
              <p className="mt-0.5 text-xs text-muted">
                {current.time_label}
                {current.zone ? ` · ${current.zone}` : ""}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted">
              Nothing scheduled right now.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-brand">
            <CalendarClock size={12} aria-hidden />
            Up next
          </p>
          {next ? (
            <>
              <p className="mt-1 font-semibold leading-snug">{next.title}</p>
              <p className="mt-0.5 text-xs text-muted">
                {next.day_label} · {next.time_label}
                {next.zone ? ` · ${next.zone}` : ""}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted">
              The schedule is complete — see you at the closing ceremony.
            </p>
          )}
        </div>
      </section>

      {/* Quick actions --------------------------------------------------- */}
      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          Quick actions
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <QuickLink
            href="/id-card"
            icon={QrCode}
            title="My identity card"
            body="Show your QR at the desk"
          />
          <QuickLink
            href="/schedule"
            icon={CalendarClock}
            title="Full schedule"
            body="All three days, by zone"
          />
          <QuickLink
            href="/quiz"
            icon={Gamepad2}
            title="Quiz & games"
            body="Play and score points"
          />
          <QuickLink
            href="/leaderboard"
            icon={Trophy}
            title="Leaderboard"
            body="See where you stand"
          />
          {isDeskStaff && (
            <QuickLink
              href="/admin/scan"
              icon={QrCode}
              title="Scan identity cards"
              body="Check members in"
            />
          )}
          {isExecutive && (
            <QuickLink
              href="/admin"
              icon={Shield}
              title="Admin panel"
              body="Members, quizzes, announcements"
            />
          )}
        </div>
      </section>

      {/* Announcements --------------------------------------------------- */}
      <section className="mt-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-muted">
            <Bell size={13} aria-hidden />
            Announcements
          </h2>
          <Link
            href="/announcements"
            className="text-sm font-medium text-brand hover:underline"
          >
            All
          </Link>
        </div>

        {announcements.length === 0 ? (
          <p className="mt-3 rounded-xl border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
            No announcements yet. Anything urgent from the organising team appears
            here.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {announcements.map((item) => (
              <li
                key={item.id}
                className={`rounded-xl border p-4 ${
                  item.urgent
                    ? "border-danger/30 bg-danger/5"
                    : "border-border bg-surface"
                }`}
              >
                <p className="font-semibold leading-snug">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{item.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 text-xs text-muted">
        {EVENT.venue} · {EVENT.address}
      </p>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  title,
  body,
}: {
  href: string;
  icon: typeof QrCode;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-brand/40"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
        <Icon size={18} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-tight">{title}</span>
        <span className="block truncate text-xs text-muted">{body}</span>
      </span>
      <ArrowRight
        size={16}
        aria-hidden
        className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}
