import { MapPin } from "lucide-react";
import type { ScheduleEvent } from "@/lib/types";
import { groupByDay } from "@/lib/schedule";

/** Highlighted slots — the ones people navigate the app to find. */
const KEY_SESSIONS = new Set([
  "Registration Starts",
  "Opening Ceremony",
  "Quiz & Refreshments",
  "Presentations",
  "Closing Ceremony",
]);

export function Timeline({
  events,
  nowIso,
}: {
  events: ScheduleEvent[];
  /** Rendered "now" — used to mark the session in progress. */
  nowIso?: string;
}) {
  const days = groupByDay(events);
  const now = nowIso ? new Date(nowIso).getTime() : null;

  return (
    <div className="grid gap-8">
      {days.map(({ day, label, events: dayEvents }) => (
        <section key={day} aria-labelledby={`day-${day}`}>
          <h2
            id={`day-${day}`}
            className="sticky top-14 z-10 -mx-4 bg-background/95 px-4 py-2 text-sm font-bold uppercase tracking-wide text-brand backdrop-blur"
          >
            {label}
          </h2>

          <ol className="mt-2 border-l-2 border-border pl-4">
            {dayEvents.map((event) => {
              const starts = event.starts_at ? new Date(event.starts_at).getTime() : null;
              const ends = event.ends_at ? new Date(event.ends_at).getTime() : null;
              const inProgress =
                now !== null &&
                starts !== null &&
                ends !== null &&
                now >= starts &&
                now < ends;
              const isKey = KEY_SESSIONS.has(event.title);

              return (
                <li key={event.id} className="relative py-3">
                  <span
                    aria-hidden
                    className={`absolute -left-[21px] top-5 h-3 w-3 rounded-full border-2 border-background ${
                      inProgress
                        ? "bg-accent ring-4 ring-accent/25"
                        : isKey
                          ? "bg-brand"
                          : "bg-border"
                    }`}
                  />

                  <div
                    className={`rounded-xl border p-3 ${
                      inProgress
                        ? "border-accent/40 bg-accent-soft"
                        : isKey
                          ? "border-brand/25 bg-brand-soft/40"
                          : "border-border bg-surface"
                    }`}
                  >
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="font-mono text-xs font-semibold text-brand">
                        {event.time_label}
                      </span>
                      {inProgress && (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          Now
                        </span>
                      )}
                    </div>

                    <p className="mt-0.5 font-semibold leading-snug">{event.title}</p>

                    {event.zone && (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
                        <MapPin size={12} aria-hidden />
                        {event.zone}
                      </p>
                    )}

                    {event.description && (
                      <p className="mt-2 text-sm leading-relaxed text-muted">
                        {event.description}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
