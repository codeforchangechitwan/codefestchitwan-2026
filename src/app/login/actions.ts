"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null };

/** Only a path on this site is an acceptable post-login destination. */
function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function signIn(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) {
    return { error: "Enter both your email and the password we mailed you." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Deliberately vague: do not reveal whether the address is registered.
    return {
      error:
        "Those details don't match a registered account. Accounts are created by the Codefest team — check the email we sent you, or contact execution@codefestnepal.com.",
    };
  }

  // A deactivated member gets an account but no access.
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active, must_change_password")
    .eq("id", data.user.id)
    .single();

  if (profile && !profile.is_active) {
    await supabase.auth.signOut();
    return {
      error: "This account has been deactivated. Please contact the Codefest team.",
    };
  }

  redirect(profile?.must_change_password ? "/profile/password" : next);
}
