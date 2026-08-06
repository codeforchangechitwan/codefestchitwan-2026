import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ShieldAlert, ShieldX } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROLE_COLORS, ROLE_LABELS, type Role } from "@/lib/types";
import { CheckInButton } from "./check-in-button";

export const metadata: Metadata = { title: "Verify identity card" };

type VerifyRow = {
  profile_id: string;
  full_name: string;
  role: Role;
  team_name: string | null;
  institution: string | null;
  room: string | null;
  is_active: boolean;
  checked_in_at: string | null;
};

/**
 * Landing page for a scanned identity card.
 *
 * Any phone camera resolves the QR to this URL. Only executives and volunteers
 * can actually read the card — the lookup function enforces that in the
 * database, not just here.
 */
export default async function VerifyPage(props: PageProps<"/verify/[token]">) {
  const { token } = await props.params;
  const { profile: viewer } = await requireMember();

  const isDeskStaff = viewer.role === "executive" || viewer.role === "volunteer";

  if (!isDeskStaff) {
    return (
      <Shell
        icon={<ShieldAlert size={26} className="text-warning" aria-hidden />}
        title="Staff only"
      >
        <p className="text-sm leading-relaxed text-muted">
          Identity cards can only be verified by executive members and volunteers. If
          you scanned your own card, open{" "}
          <Link href="/id-card" className="font-medium text-brand underline">
            My identity card
          </Link>{" "}
          instead.
        </p>
      </Shell>
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_qr_token", { token });
  const record = (Array.isArray(data) ? data[0] : null) as VerifyRow | null;

  if (error || !record) {
    return (
      <Shell
        icon={<ShieldX size={26} className="text-danger" aria-hidden />}
        title="Card not recognised"
      >
        <p className="text-sm leading-relaxed text-muted">
          This QR doesn&rsquo;t match any Codefest identity card. Ask the person to
          open the app and show their card from{" "}
          <span className="font-medium">My identity card</span>, or look them up in the
          admin panel.
        </p>
        <Link
          href="/admin/scan"
          className="mt-4 inline-flex rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong"
        >
          Back to scanner
        </Link>
      </Shell>
    );
  }

  const accent = ROLE_COLORS[record.role];

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-lg">
        <div
          className="px-5 py-4"
          style={{ backgroundColor: accent.bg, color: accent.fg }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] opacity-80">
            Verified card
          </p>
          <p className="text-lg font-extrabold">{ROLE_LABELS[record.role]}</p>
        </div>

        <div className="px-5 py-5">
          <p className="text-xl font-bold leading-tight">{record.full_name}</p>

          <dl className="mt-4 grid gap-3 text-sm">
            {record.team_name && (
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted">Team</dt>
                <dd className="font-semibold">{record.team_name}</dd>
              </div>
            )}
            {record.institution && (
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted">
                  Institution
                </dt>
                <dd className="font-medium">{record.institution}</dd>
              </div>
            )}
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted">Room</dt>
              <dd className="font-semibold">{record.room ?? "Not allocated"}</dd>
            </div>
          </dl>

          {!record.is_active && (
            <p className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
              This account is deactivated. Do not admit — send them to the desk.
            </p>
          )}

          {record.checked_in_at ? (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
              <BadgeCheck size={16} aria-hidden />
              Already checked in
            </p>
          ) : (
            <div className="mt-4">
              <CheckInButton token={token} />
            </div>
          )}
        </div>
      </div>

      <Link
        href="/admin/scan"
        className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold hover:border-brand/40"
      >
        Scan another card
      </Link>
    </div>
  );
}

function Shell({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <div className="rounded-2xl border border-border bg-surface p-6 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-muted">
          {icon}
        </span>
        <h1 className="mt-3 text-xl font-bold">{title}</h1>
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}
