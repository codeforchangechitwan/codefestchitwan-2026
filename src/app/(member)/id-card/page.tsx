import type { Metadata } from "next";
import Image from "next/image";
import { BadgeCheck, Download, Info } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { renderQrSvg } from "@/lib/qr";
import { EVENT } from "@/lib/event";
import { ROLE_COLORS, ROLE_LABELS, ROLE_SHORT } from "@/lib/types";

export const metadata: Metadata = { title: "My identity card" };

export default async function IdCardPage() {
  const { profile } = await requireMember();
  const qrSvg = await renderQrSvg(profile.qr_token);
  const accent = ROLE_COLORS[profile.role];

  const cardId = profile.qr_token.slice(0, 8).toUpperCase();

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Identity card</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Show this at the Registration Desk in Building A and whenever a volunteer
        asks. It works offline once this page has loaded.
      </p>

      {/* The card ------------------------------------------------------- */}
      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-surface shadow-lg">
        <div
          className="flex items-center justify-between gap-3 px-5 py-4"
          style={{ backgroundColor: accent.bg, color: accent.fg }}
        >
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] opacity-80">
              Codefest 2026 · Chitwan
            </p>
            <p className="truncate text-lg font-extrabold leading-tight">
              {ROLE_SHORT[profile.role]}
            </p>
          </div>
          <Image
            src="/brand/cfc-logo.png"
            alt=""
            width={104}
            height={52}
            className="h-7 w-auto shrink-0 rounded bg-white/95 p-0.5"
          />
        </div>

        <div className="px-5 py-5">
          <p className="text-xl font-bold leading-tight">{profile.full_name}</p>
          <p className="mt-0.5 text-sm text-muted">{ROLE_LABELS[profile.role]}</p>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {profile.participant_code && (
              <div className="col-span-2">
                <dt className="text-[11px] uppercase tracking-wide text-muted">
                  Participant ID
                </dt>
                <dd className="font-mono text-lg font-bold tracking-wide text-brand">
                  {profile.participant_code}
                </dd>
              </div>
            )}
            {profile.team_name && (
              <div className="col-span-2">
                <dt className="text-[11px] uppercase tracking-wide text-muted">
                  Team
                </dt>
                <dd className="font-semibold">{profile.team_name}</dd>
              </div>
            )}
            {profile.institution && (
              <div className="col-span-2">
                <dt className="text-[11px] uppercase tracking-wide text-muted">
                  Institution
                </dt>
                <dd className="font-medium">{profile.institution}</dd>
              </div>
            )}
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted">Room</dt>
              <dd className="font-semibold">
                {profile.room ?? (
                  <span className="font-normal text-muted">Allocated at desk</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted">
                Card ID
              </dt>
              <dd className="font-mono font-semibold">{cardId}</dd>
            </div>
          </dl>

          {/* QR ---------------------------------------------------------- */}
          <div className="mt-5 flex flex-col items-center rounded-2xl bg-white p-4">
            <div
              className="h-48 w-48 [&>svg]:h-full [&>svg]:w-full"
              // The SVG comes from the qrcode library, not from user input.
              dangerouslySetInnerHTML={{ __html: qrSvg }}
              role="img"
              aria-label={`QR identity code for ${profile.full_name}`}
            />
            <p className="mt-2 font-mono text-[10px] tracking-wide text-[#7a6455]">
              {cardId}
            </p>
          </div>

          {profile.checked_in_at ? (
            <p className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-success/10 px-3 py-2 text-sm font-medium text-success">
              <BadgeCheck size={15} aria-hidden />
              Checked in
            </p>
          ) : (
            <p className="mt-4 rounded-xl bg-surface-muted px-3 py-2 text-center text-sm text-muted">
              Not checked in yet
            </p>
          )}
        </div>

        <div
          className="px-5 py-3 text-center text-[11px]"
          style={{ backgroundColor: accent.bg, color: accent.fg }}
        >
          {EVENT.venue} · {EVENT.datesEnglish}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface-muted p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Info size={15} className="text-brand" aria-hidden />
          Keep it handy
        </p>
        <ul className="mt-2 grid gap-1.5 text-sm leading-relaxed text-muted">
          <li>
            Add this app to your home screen so the card is one tap away — use your
            browser&rsquo;s &ldquo;Install&rdquo; or &ldquo;Add to Home Screen&rdquo;
            option.
          </li>
          <li>
            Screenshot the QR as a backup in case your phone loses signal at the gate.
          </li>
          <li>
            Your card is personal. If you think someone else has a copy, tell the
            registration desk and they&rsquo;ll issue a new code.
          </li>
        </ul>
      </div>

      <a
        href={`/api/id-card/${profile.qr_token}.svg`}
        download={`codefest-2026-${cardId}.svg`}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold transition-colors hover:border-brand/40"
      >
        <Download size={15} aria-hidden />
        Download QR (SVG)
      </a>
    </div>
  );
}
