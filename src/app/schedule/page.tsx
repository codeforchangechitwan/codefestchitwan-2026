import type { Metadata } from "next";
import { Building2, Clock } from "lucide-react";
import { Timeline } from "@/components/timeline";
import { getSchedule } from "@/lib/schedule";
import { BUILDINGS, EVENT } from "@/lib/event";

export const metadata: Metadata = {
  title: "Schedule",
  description:
    "Full Codefest Chitwan 2026 hackathon timeline, 14–16 August, at Forbes College Chitwan.",
};

// Reads request cookies (via the Supabase client), so this renders per-request
// and the "Now" marker is always current.
export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const { events, live } = await getSchedule();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Event timeline</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {EVENT.datesNepali} · {EVENT.datesEnglish} at {EVENT.venue}. All times are
          Nepal Time (UTC+05:45).
        </p>
        {!live && (
          <p className="mt-3 rounded-xl border border-border bg-surface-muted px-3 py-2 text-xs text-muted">
            Showing the published timeline. Live updates appear here once the event
            database is connected.
          </p>
        )}
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        {BUILDINGS.map((building) => (
          <div
            key={building.id}
            className="rounded-xl border border-border bg-surface p-3"
          >
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Building2 size={14} className="text-brand" aria-hidden />
              {building.name}
            </p>
            <p className="mt-0.5 text-xs text-muted">{building.purpose}</p>
          </div>
        ))}
      </section>

      <p className="mt-6 inline-flex items-center gap-1.5 text-xs text-muted">
        <Clock size={13} aria-hidden />
        Sessions marked in coral are running now.
      </p>

      <div className="mt-4">
        <Timeline events={events} nowIso={new Date().toISOString()} />
      </div>
    </div>
  );
}
