import type { Metadata } from "next";
import { AlertTriangle, Bell } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Announcement } from "@/lib/types";

export const metadata: Metadata = { title: "Announcements" };

const FORMATTER = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Kathmandu",
});

export default async function AnnouncementsPage() {
  await requireMember();

  const supabase = await createClient();
  const { data } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const announcements = (data ?? []) as Announcement[];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <Bell size={22} className="text-brand" aria-hidden />
        Announcements
      </h1>
      <p className="mt-2 text-sm text-muted">
        Updates from the organising team. Urgent notices are highlighted.
      </p>

      {announcements.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
          Nothing yet. Check back during the event.
        </p>
      ) : (
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
      )}
    </div>
  );
}
