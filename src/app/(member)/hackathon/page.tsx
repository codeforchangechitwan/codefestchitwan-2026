import type { Metadata } from "next";
import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hackathonFromRow } from "@/lib/hackathon";
import { HackathonView } from "./hackathon-view";
import { HackathonSettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Hackathon clock" };

/**
 * The 36-hour clock.
 *
 * Open to every member, not just the desk: this is the number the whole
 * building paces itself against, and the projector and 150 phones show the
 * same one. Only executives get the button, the same gate every other lever on
 * event_settings uses.
 */
export default async function HackathonPage() {
  const { profile } = await requireMember();
  const isExecutive = profile.role === "executive";

  const supabase = await createClient();
  const { data } = await supabase.rpc("hackathon_state");
  const row = Array.isArray(data) ? data[0] : null;

  // skew 0: the client measures the real thing on its first read.
  const initial = hackathonFromRow(row, 0);

  return (
    <div className="min-h-[100svh]">
      <HackathonView initial={initial} canControl={isExecutive} />

      {isExecutive && (
        <div className="mx-auto w-full max-w-xl px-4 pb-16">
          <HackathonSettingsForm
            coordinatorName={initial.coordinatorName ?? ""}
            coordinatorTitle={initial.coordinatorTitle ?? ""}
            hours={initial.durationSeconds / 3600}
            running={initial.status !== "idle"}
          />
          <p className="mt-6 text-center text-xs text-muted">
            <Link href="/admin" className="font-medium text-brand hover:underline">
              Back to admin
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
