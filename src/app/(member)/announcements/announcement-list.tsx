"use client";

import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLiveQuery } from "@/lib/use-live-query";
import type { Announcement } from "@/lib/types";

const FORMATTER = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Kathmandu",
});

/**
 * The announcements list, kept live.
 *
 * This is the screen the organisers actually reach the hall with, so it is the
 * one that most needs to arrive without anybody pulling to refresh. The re-read
 * goes to Supabase and RLS applies the same audience filter it applies on the
 * server, so a volunteer-only notice stays volunteer-only.
 */
export function AnnouncementList({ initial }: { initial: Announcement[] }) {
  const { data: announcements, live } = useLiveQuery({
    topics: ["announcements"],
    initial,
    fetcher: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Announcement[];
    },
  });

  if (announcements.length === 0) {
    return (
      <p className="mt-6 rounded-2xl border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
        Nothing yet. Check back during the event.
      </p>
    );
  }

  return (
    <>
      <ul className="mt-6 grid gap-3">
        {announcements.map((item) => (
          <li
            key={item.id}
            className={`rounded-2xl border p-5 ${
              item.urgent
                ? "border-danger/30 bg-danger/5"
                : "border-border bg-surface"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-semibold leading-snug">
                {item.urgent && (
                  <AlertTriangle
                    size={15}
                    className="mr-1.5 inline text-danger"
                    aria-label="Urgent"
                  />
                )}
                {item.title}
              </h2>
              <time
                dateTime={item.created_at}
                className="shrink-0 text-xs text-muted"
              >
                {FORMATTER.format(new Date(item.created_at))}
              </time>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">
              {item.body}
            </p>
          </li>
        ))}
      </ul>

      {!live && (
        <p className="mt-4 text-center text-[11px] text-muted">
          Live updates unavailable — this list refreshes on a timer.
        </p>
      )}
    </>
  );
}
