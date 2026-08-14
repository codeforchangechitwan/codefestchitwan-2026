"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireExecutive } from "@/lib/auth";

export type CeremonyResult = { ok: boolean; message: string };

/**
 * Cuts the ribbon.
 *
 * The database decides the instant, not this process and certainly not the
 * laptop driving the projector — every phone in the hall then measures "how
 * long ago" against that one server timestamp. set_ceremony('cut') is a no-op
 * once the ribbon is already cut, so a nervous second tap cannot replay the
 * celebration on 150 devices.
 */
export async function cutRibbon(): Promise<CeremonyResult> {
  await requireExecutive();

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_ceremony", { action: "cut" });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/ribbon");
  revalidatePath("/dashboard");
  return { ok: true, message: "The programme has begun." };
}

export async function resetRibbon(): Promise<CeremonyResult> {
  await requireExecutive();

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_ceremony", { action: "reset" });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/ribbon");
  revalidatePath("/dashboard");
  return { ok: true, message: "Ribbon reset — the screen is ready to rehearse." };
}

export async function saveCeremonyDetails(
  formData: FormData,
): Promise<CeremonyResult> {
  await requireExecutive();

  const guestName = String(formData.get("guest_name") ?? "").trim();
  const guestTitle = String(formData.get("guest_title") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();

  if (!guestName) {
    return { ok: false, message: "The chief guest needs a name." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_ceremony", {
    action: "details",
    guest_name: guestName,
    guest_title: guestTitle,
    title,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/ribbon");
  return { ok: true, message: "Saved." };
}
