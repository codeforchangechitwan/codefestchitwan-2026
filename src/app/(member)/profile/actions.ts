"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { parseGithubUsername } from "@/lib/github";

export type ProfileState = { error: string | null };

/** Raised by profiles_github_username_key when a handle is already claimed. */
const UNIQUE_VIOLATION = "23505";

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

  // Accepts a pasted profile URL as readily as a bare handle; see lib/github.ts.
  const github = parseGithubUsername(String(formData.get("github_username") ?? ""));
  if (!github.ok) {
    return { error: github.error };
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
      github_username: github.username,
    })
    .eq("id", profile.id);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return {
        error:
          "Someone has already posted that GitHub username — check you have not pasted a teammate's link.",
      };
    }
    return { error: "Couldn't save your details. Please try again." };
  }

  redirect("/profile?saved=1");
}
