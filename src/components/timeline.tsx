import { MapPin, Sparkles } from "lucide-react";
import type { ScheduleEvent } from "@/lib/types";
import { groupByDay, isKeySession } from "@/lib/schedule-utils";

export function Timeline({
  events,
  nowIso,
}: {
  events: ScheduleEvent[];
  nowIso?: string;
}) {
  const days = groupByDay(events);
  const now = nowIso ? new Date(nowIso).getTime() : null;

  return (
    <div className="grid gap-10">
      {days.map(({ day, label, events: dayEvents }) => (
        <section key={day} aria-labelledby={`day-${day}`}>
          <div className="sticky top-16 z-20 -mx-4 mb-4 bg-background/80 px-4 py-2.5 backdrop-blur-md border-b border-border/50">
            <h2
              id={`day-${day}`}
              className="text-xs font-bold uppercase tracking-widest text-brand flex items-center gap-2"
            >
              <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
              {label}
            </h2>
          </div>

          <ol className="relative ml-3 border-l-2 border-border/60 pl-6 space-y-6">
            {dayEvents.map((event) => {
              const starts = event.starts_at ? new Date(event.starts_at).getTime() : null;
              const ends = event.ends_at ? new Date(event.ends_at).getTime() : null;
              const inProgress =
                now !== null &&
                starts !== null &&
                ends !== null &&
                now >= starts &&
                now < ends;
              const isKey = isKeySession(event.title);

              return (
                <li key={event.id} className="relative group">
                  {/* Node Dot */}
                  <span
                    aria-hidden
                    className={`absolute -left-[31px] top-4 h-4 w-4 rounded-full border-2 border-background transition-transform group-hover:scale-125 ${
                      inProgress
                        ? "bg-accent ring-4 ring-accent/30 animate-pulse"
                        : isKey
                          ? "bg-brand ring-2 ring-brand/20"
                          : "bg-border"
                    }`}
                  />

                  {/* Card Container */}
                  <div
                    className={`glass-card p-4 sm:p-5 transition-all duration-300 hover-rise ${
                      inProgress
                        ? "border-accent/50 bg-accent-soft/30 shadow-accent/10"
                        : isKey
                          ? "border-brand/40 bg-brand-soft/20 shadow-brand/5"
                          : "hover:border-border/80"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-brand bg-brand-soft px-2.5 py-1 rounded-md">
                        {event.time_label}
                      </span>
                      <div className="flex items-center gap-2">
                        {isKey && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 border border-brand/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                            <Sparkles size={10} /> Key Session
                          </span>
                        )}
                        {inProgress && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white animate-pulse">
                            Now Live
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="mt-2 text-base font-bold text-foreground leading-snug">
                      {event.title}
                    </h3>

                    {event.zone && (
                      <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted font-medium">
                        <MapPin size={13} className="text-brand shrink-0" aria-hidden />
                        {event.zone}
                      </p>
                    )}

                    {event.description && (
                      <p className="mt-2 text-sm leading-relaxed text-muted/90">
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

