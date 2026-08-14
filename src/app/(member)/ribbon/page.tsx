import type { Metadata } from "next";
import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RibbonView, type CeremonyState } from "./ribbon-view";
import { CeremonyDetailsForm } from "./details-form";

export const metadata: Metadata = { title: "Inauguration" };

/**
 * The ribbon screen.
 *
 * Open to every member, not just the desk: this is the page the hall watches
 * on their own phones while the projector shows the same thing, which is the
 * point of it being live. Only executives get the button.
 */
export default async function RibbonPage() {
  const { profile } = await requireMember();
  const isExecutive = profile.role === "executive";

  const supabase = await createClient();
  const { data } = await supabase.rpc("ceremony_state");
  const row = Array.isArray(data) ? data[0] : null;

  const initial: CeremonyState = {
    ceremonyTitle: row?.ceremony_title ?? null,
    chiefGuestName: row?.chief_guest_name ?? null,
    chiefGuestTitle: row?.chief_guest_title ?? null,
    ribbonCutAt: row?.ribbon_cut_at ?? null,
    cutByName: row?.cut_by_name ?? null,
    secondsSinceCut: row?.seconds_since_cut ?? null,
  };

  return (
    <div className="min-h-[100svh]">
      <RibbonView initial={initial} canControl={isExecutive} />

      {isExecutive && (
        <div className="mx-auto w-full max-w-xl px-4 pb-16">
          <CeremonyDetailsForm
            guestName={initial.chiefGuestName ?? ""}
            guestTitle={initial.chiefGuestTitle ?? ""}
            title={initial.ceremonyTitle ?? ""}
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
