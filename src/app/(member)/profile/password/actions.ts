"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";

export type PasswordState = { error: string | null; success?: boolean };

const MIN_LENGTH = 10;

export async function changePassword(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const { profile } = await requireMember({ allowPasswordChange: true });

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < MIN_LENGTH) {
    return { error: `Use at least ${MIN_LENGTH} characters.` };
  }
  if (password !== confirm) {
    return { error: "The two passwords don't match." };
  }
  if (!/[a-z]/i.test(password) || !/[0-9]/.test(password)) {
    return { error: "Include at least one letter and one number." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      error:
        error.message === "New password should be different from the old password."
          ? "Choose a password different from the one we mailed you."
          : "Couldn't update your password. Please try again.",
    };
  }

  // Clear the flag so the guard stops redirecting here.
  await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", profile.id);

  redirect("/dashboard?welcome=1");
}
