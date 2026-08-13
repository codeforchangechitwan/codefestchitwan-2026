"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { ScheduleEvent } from "@/lib/types";
import { isKeySession } from "@/lib/schedule-utils";
import { Timeline } from "@/components/timeline";

const KATHMANDU = "Asia/Kathmandu";

const DAY_LABEL = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** Today in Kathmandu as YYYY-MM-DD, to match `schedule_events.day`. */
function kathmanduToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: KATHMANDU }).format(new Date());
}

export function ScheduleView({ events, nowIso }: { events: ScheduleEvent[]; nowIso: string }) {
  /*
   * Tabs are derived from the events rather than hardcoded.
   *
   * They used to compare `evt.day !== "1"`, but `day` is a date —
   * "2026-08-14" — so every day tab matched nothing and all three rendered
   * the empty state. Building the list from the data means the tabs cannot
   * drift from it again if the dates move.
   */
  const days = useMemo(() => {
    const seen = new Map<string, string>();
    for (const event of events) {
      if (!seen.has(event.day)) seen.set(event.day, event.day_label);
    }
    return [...seen.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, label], index) => ({
        id: day,
        // "Day 1 (14 Aug)" — parsed as UTC so the label cannot slip a day.
        label: `Day ${index + 1} (${DAY_LABEL.format(new Date(`${day}T00:00:00Z`))})`,
        fullLabel: label,
      }));
  }, [events]);

  /* During the event, open on today rather than on the whole three days. */
  const [activeTab, setActiveTab] = useState<string>(() => {
    const today = kathmanduToday();
    return events.some((event) => event.day === today) ? today : "all";
  });
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredEvents = events.filter((evt) => {
    if (activeTab === "key") {
      if (!isKeySession(evt.title)) return false;
    } else if (activeTab !== "all" && evt.day !== activeTab) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = evt.title.toLowerCase().includes(q);
      const matchDesc = evt.description?.toLowerCase().includes(q);
      const matchZone = evt.zone?.toLowerCase().includes(q);
      return Boolean(matchTitle || matchDesc || matchZone);
    }

    return true;
  });

  return (
    <div className="mt-6">
      {/* Filter Bar */}
      <div className="glass-card p-3 border-glass mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: "all", label: "All Sessions" },
            ...days.map(({ id, label }) => ({ id, label })),
            { id: "key", label: "★ Key Highlights" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-brand text-white shadow-md shadow-brand/20"
                  : "text-muted hover:text-foreground hover:bg-surface-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sessions, zones..."
            className="w-full rounded-xl border border-glass bg-surface/50 pl-9 pr-3 py-1.5 text-xs text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
        </div>
      </div>

      {/* Render Timeline */}
      {filteredEvents.length > 0 ? (
        <Timeline events={filteredEvents} nowIso={nowIso} />
      ) : (
        <div className="glass-card p-12 text-center text-muted text-sm border-glass">
          No schedule sessions match your filter criteria.
        </div>
      )}
    </div>
  );
}
