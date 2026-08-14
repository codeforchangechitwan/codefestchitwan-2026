import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  FolderGit2,
  Gamepad2,
  GitFork,
  QrCode,
  ContactRound,
  ScanLine,
  Scissors,
  Shield,
  Shuffle,
  Timer,
  TriangleAlert,
  UserPlus,
  Users,
  UsersRound,
} from "lucide-react";
import { requireExecutive } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSmtpConfig } from "@/lib/env";
import { EVENT_DAYS, kathmanduDayRange } from "@/lib/attendance";
import { ROLES, ROLE_LABELS } from "@/lib/types";

export const metadata: Metadata = { title: "Admin" };

/**
 * Today, if today is one of the three event days. Outside them the scan
 * counter would read zero all day, which looks like a broken scanner rather
 * than like nothing being on.
 */
function currentEventDay() {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
  }).format(new Date());
  return EVENT_DAYS.find((day) => day.date === today) ?? null;
}

export default async function AdminPage() {
  await requireExecutive();
  const supabase = await createClient();

  const eventDay = currentEventDay();
  const range = eventDay ? kathmanduDayRange(eventDay.date) : null;

  const [{ data: profiles }, { count: teamCount }, { count: scansToday }] =
    await Promise.all([
      supabase.from("profiles").select("role, checked_in_at, is_active"),
      supabase.from("teams").select("id", { count: "exact", head: true }),
      range
        ? supabase
            .from("check_ins")
            .select("id", { count: "exact", head: true })
            .gte("created_at", range.start)
            .lt("created_at", range.end)
        : Promise.resolve({ count: null }),
    ]);

  const rows = profiles ?? [];
  const total = rows.length;
  const checkedIn = rows.filter((r) => r.checked_in_at !== null).length;
  const suspended = rows.filter((r) => r.is_active === false).length;

  const byRole = ROLES.map((role) => ({
    role,
    count: rows.filter((r) => r.role === role).length,
  }));

  const smtpReady = getSmtpConfig() !== null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <Shield size={22} className="text-brand" aria-hidden />
        Admin
      </h1>
      <p className="mt-2 text-sm text-muted">
        Members, check-in, quizzes and announcements for Codefest Chitwan 2026.
      </p>

      {!smtpReady && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            SMTP isn&rsquo;t configured, so passwords can&rsquo;t be emailed
            automatically. Accounts will still be created and the password shown on
            screen for you to send. Set <code>SMTP_HOST</code>, <code>SMTP_USER</code>{" "}
            and <code>SMTP_PASSWORD</code> to enable mailing.
          </span>
        </p>
      )}

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Members" value={total} />
        <Stat label="Checked in" value={checkedIn} />
        <Stat label="Teams" value={teamCount ?? 0} />
        {eventDay ? (
          <Stat label="Scans today" value={scansToday ?? 0} />
        ) : (
          <Stat label="Suspended" value={suspended} />
        )}
      </section>

      {eventDay && suspended > 0 && (
        <p className="mt-3 text-xs text-muted">
          {suspended} suspended {suspended === 1 ? "account" : "accounts"}.
        </p>
      )}

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          By category
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {byRole.map(({ role, count }) => (
            <li
              key={role}
              className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-sm"
            >
              <span>{ROLE_LABELS[role]}</span>
              <span className="font-mono font-bold tabular-nums text-brand">
                {count}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-2">
        <AdminLink
          href="/admin/members"
          icon={Users}
          title="Members"
          body="Create accounts, mail passwords, set categories"
        />
        <AdminLink
          href="/admin/members#create"
          icon={UserPlus}
          title="Add a member"
          body="Provision one account and email the password"
        />
        <AdminLink
          href="/admin/scan"
          icon={QrCode}
          title="Scan & check in"
          body="Camera scanner for the registration desk"
        />
        <AdminLink
          href="/admin/attendance"
          icon={ScanLine}
          title="Attendance"
          body="Every scan, manual check-in, CSV export"
        />
        <AdminLink
          href="/admin/roster"
          icon={ContactRound}
          title="Roster"
          body="Look anyone up — desk staff can use this too"
        />
        <AdminLink
          href="/admin/teams"
          icon={UsersRound}
          title="Teams"
          body="Rooms, tables and who is on which team"
        />
        <AdminLink
          href="/admin/announcements"
          icon={Bell}
          title="Announcements"
          body="Post updates to everyone or one category"
        />
        <AdminLink
          href="/admin/quizzes"
          icon={Gamepad2}
          title="Quizzes"
          body="Publish or hide quizzes and games"
        />
        <AdminLink
          href="/admin/pitch"
          icon={Timer}
          title="Pitch timer"
          body="Stage clock, running order, projector view"
        />
        <AdminLink
          href="/admin/wheel?mode=tables"
          icon={Shuffle}
          title="The draw"
          body="Table numbers and Sunday's pitch order"
        />
        <AdminLink
          href="/admin/submissions"
          icon={FolderGit2}
          title="Submissions"
          body="Who has submitted, deadline control, CSV export"
        />
        <AdminLink
          href="/admin/github"
          icon={GitFork}
          title="GitHub profiles"
          body="Handles by team, and who has not posted one"
        />
        <AdminLink
          href="/ribbon"
          icon={Scissors}
          title="Inauguration"
          body="Ribbon screen for the projector, and the button that starts it"
        />
        <AdminLink
          href="/hackathon"
          icon={Timer}
          title="Hackathon clock"
          body="The 36-hour countdown, and the button that starts it"
        />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 text-center">
      <p className="font-mono text-2xl font-extrabold tabular-nums text-brand">
        {value}
      </p>
      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}

function AdminLink({
  href,
  icon: Icon,
  title,
  body,
}: {
  href: string;
  icon: typeof Users;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-brand/40"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
        <Icon size={18} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold leading-tight">{title}</span>
        <span className="block text-xs leading-relaxed text-muted">{body}</span>
      </span>
    </Link>
  );
}
