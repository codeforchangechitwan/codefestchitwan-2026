"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";

export type ProfileState = { error: string | null };

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const { profile } = await requireMember();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const institution = String(formData.get("institution") ?? "").trim();

  if (fullName.length < 2) {
    return { error: "Please enter your full name." };
  }

  const supabase = await createClient();
  // Role, email, room, QR token and team are intentionally not writable here —
  // the database trigger rejects those changes for non-executives anyway. Team
  // membership in particular comes from the imported roster, not from free
  // text, so that teammates actually resolve to the same team.
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone: phone || null,
      institution: institution || null,
    })
    .eq("id", profile.id);

  if (error) {
    return { error: "Couldn't save your details. Please try again." };
  }

  redirect("/profile?saved=1");
}
