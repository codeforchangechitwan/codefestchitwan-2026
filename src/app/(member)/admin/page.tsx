import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  Gamepad2,
  QrCode,
  Shield,
  TriangleAlert,
  UserPlus,
  Users,
} from "lucide-react";
import { requireExecutive } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSmtpConfig } from "@/lib/env";
import { ROLES, ROLE_LABELS } from "@/lib/types";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  await requireExecutive();
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("role, checked_in_at, is_active");

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

      <section className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Members" value={total} />
        <Stat label="Checked in" value={checkedIn} />
        <Stat label="Suspended" value={suspended} />
      </section>

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
