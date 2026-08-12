"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { ScheduleEvent } from "@/lib/types";
import { Timeline } from "@/components/timeline";

export function ScheduleView({ events, nowIso }: { events: ScheduleEvent[]; nowIso: string }) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredEvents = events.filter((evt) => {
    // Filter by tab
    if (activeTab === "day-1" && evt.day !== "1") return false;
    if (activeTab === "day-2" && evt.day !== "2") return false;
    if (activeTab === "day-3" && evt.day !== "3") return false;
    if (activeTab === "key") {
      const keySet = new Set(["Registration Starts", "Opening Ceremony", "Quiz & Refreshments", "Presentations", "Closing Ceremony"]);
      if (!keySet.has(evt.title)) return false;
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = evt.title.toLowerCase().includes(q);
      const matchDesc = evt.description?.toLowerCase().includes(q);
      const matchZone = evt.zone?.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchZone;
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
            { id: "day-1", label: "Day 1 (Aug 14)" },
            { id: "day-2", label: "Day 2 (Aug 15)" },
            { id: "day-3", label: "Day 3 (Aug 16)" },
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
