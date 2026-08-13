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
  await requireMember({ allowPasswordChange: true });

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

  // Clear the flag so the guard stops redirecting here. must_change_password is
  // a protected column — the profile guard trigger refuses self-writes to it, so
  // a member cannot skip the forced change by PATCHing the flag at PostgREST —
  // and complete_password_change() is the one door through that guard. It
  // checks the credential really did just change before clearing anything.
  //
  // This deliberately does NOT use the service role. It used to, and because
  // the password above is already changed by the time this line runs, a host
  // missing SUPABASE_SERVICE_ROLE_KEY left members stranded: slip password dead,
  // flag still set, every retry a 500 on the same page.
  const { error: flagError } = await supabase.rpc("complete_password_change");

  if (flagError) {
    return {
      error:
        "Your new password is saved, but we couldn't finish setting up your account. Sign in again with your new password, or ask at the Registration Desk.",
    };
  }

  redirect("/dashboard?welcome=1");
}
