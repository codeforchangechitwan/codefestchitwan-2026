import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { requireExecutive } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, type Announcement } from "@/lib/types";
import { AnnouncementForm } from "./announcement-form";

export const metadata: Metadata = { title: "Post announcement" };

export default async function AdminAnnouncementsPage() {
  await requireExecutive();

  const supabase = await createClient();
  const { data } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);

  const announcements = (data ?? []) as Announcement[];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <Bell size={22} className="text-brand" aria-hidden />
        Announcements
      </h1>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-semibold">Post a new announcement</h2>
        <div className="mt-4">
          <AnnouncementForm />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          Recent
        </h2>
        {announcements.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
            Nothing posted yet.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {announcements.map((item) => (
              <li
                key={item.id}
                className={`rounded-xl border p-4 ${
                  item.urgent
                    ? "border-danger/30 bg-danger/5"
                    : "border-border bg-surface"
                }`}
              >
                <p className="font-semibold leading-snug">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{item.body}</p>
                <p className="mt-2 text-xs text-muted">
                  {item.audience === null
                    ? "Everyone"
                    : item.audience.map((role) => ROLE_LABELS[role]).join(", ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
