import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Announcement } from "@/lib/types";
import { AnnouncementList } from "./announcement-list";

export const metadata: Metadata = { title: "Announcements" };

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

      {/* Server-rendered first paint, then the client keeps it current off the
          realtime pulse — so this page is correct before any JS runs, and
          stays correct without anyone refreshing. */}
      <AnnouncementList initial={announcements} />
    </div>
  );
}
