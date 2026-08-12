import type { Metadata } from "next";
import { Building2, Calendar } from "lucide-react";
import { getSchedule } from "@/lib/schedule";
import { BUILDINGS, EVENT } from "@/lib/event";
import { ScheduleView } from "@/components/schedule-view";

export const metadata: Metadata = {
  title: "Schedule",
  description:
    "Full Codefest Chitwan 2026 hackathon timeline, 14–16 August, at Forbes College Chitwan.",
};

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const { events, live } = await getSchedule();

  return (
    <div className="relative min-h-screen py-10 px-4 max-w-4xl mx-auto">
      {/* Glow */}
      <div className="ambient-glow top-0 right-10 w-[450px] h-[250px] opacity-20" />

      <header>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand-soft px-3 py-1 text-xs font-bold text-brand mb-2">
          <Calendar size={12} />
          Event Schedule
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Full Event Timeline</h1>
        <p className="mt-1 text-xs sm:text-sm text-muted">
          {EVENT.datesNepali} · {EVENT.datesEnglish} at {EVENT.venue}. Nepal Time (UTC+05:45).
        </p>
        {!live && (
          <p className="glass-card mt-3 px-3 py-2 text-xs text-muted">
            Showing the published timeline. Live updates appear here once the event
            database is connected.
          </p>
        )}
      </header>

      {/* Building Reference Cards */}
      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        {BUILDINGS.map((building) => (
          <div
            key={building.id}
            className="glass-card p-3.5 border-glass hover:border-brand/30 transition-colors"
          >
            <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Building2 size={14} className="text-brand shrink-0" />
              {building.name}
            </p>
            <p className="mt-1 text-[11px] text-muted leading-tight">{building.purpose}</p>
          </div>
        ))}
      </section>

      {/* Interactive Schedule View */}
      <ScheduleView events={events} nowIso={new Date().toISOString()} />
    </div>
  );
}

