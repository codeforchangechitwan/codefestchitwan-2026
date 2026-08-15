"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Pencil, Trash2 } from "lucide-react";
import { AnnouncementBody } from "@/components/announcement-body";
import { ROLE_LABELS, type Announcement } from "@/lib/types";
import { deleteAnnouncement } from "../actions";
import { AnnouncementForm } from "./announcement-form";

const POSTED = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Kathmandu",
});

/**
 * One posted announcement on the admin screen, with the edit and delete that
 * turn "post and hope" into something an organiser can correct.
 *
 * It shows the notice exactly as the hall sees it — same body renderer, same
 * links, same line breaks — so a formatting mistake is visible here before
 * anybody has to open /announcements to find it.
 */
export function AnnouncementRow({ announcement }: { announcement: Announcement }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await deleteAnnouncement(announcement.id);
      if (result.ok) router.refresh();
      else {
        setError(result.message);
        setConfirming(false);
      }
    });
  }

  return (
    <li
      className={`rounded-xl border p-4 ${
        announcement.urgent ? "border-danger/30 bg-danger/5" : "border-border bg-surface"
      }`}
    >
      {editing ? (
        <AnnouncementForm
          announcement={announcement}
          onSaved={() => {
            setEditing(false);
            router.refresh();
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <p className="font-semibold leading-snug">
              {announcement.urgent && (
                <AlertTriangle
                  size={15}
                  className="mr-1.5 inline text-danger"
                  aria-label="Urgent"
                />
              )}
              {announcement.title}
            </p>
            <time
              dateTime={announcement.created_at}
              className="shrink-0 text-xs text-muted"
            >
              {POSTED.format(new Date(announcement.created_at))}
            </time>
          </div>

          <AnnouncementBody
            text={announcement.body}
            className="mt-1.5 text-sm leading-relaxed text-muted"
          />

          <p className="mt-2 text-xs text-muted">
            {announcement.audience === null
              ? "Everyone"
              : announcement.audience.map((role) => ROLE_LABELS[role]).join(", ")}
          </p>

          {error && (
            <p role="status" className="mt-2 text-xs font-medium text-danger">
              {error}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setEditing(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold transition-colors hover:border-brand/40 hover:text-brand"
            >
              <Pencil size={13} aria-hidden />
              Edit
            </button>

            {confirming ? (
              <>
                <button
                  type="button"
                  onClick={remove}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-danger px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {pending ? (
                    <Loader2 size={13} className="animate-spin" aria-hidden />
                  ) : (
                    <Trash2 size={13} aria-hidden />
                  )}
                  Yes, delete it
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={pending}
                  className="rounded-xl border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  Keep it
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-danger/30 px-3 py-2 text-xs font-semibold text-danger transition-colors hover:bg-danger/5"
              >
                <Trash2 size={13} aria-hidden />
                Delete
              </button>
            )}
          </div>
        </>
      )}
    </li>
  );
}
