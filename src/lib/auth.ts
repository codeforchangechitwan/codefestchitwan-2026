import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/supabase/server";
import { ADMIN_ROLES, type Profile, type Role } from "@/lib/types";

/**
 * Guard for member pages.
 *
 * Sends signed-out visitors to /login, deactivated accounts to /login with a
 * reason, and anyone still on their mailed password to the change-password
 * screen before they can use the rest of the app.
 */
export async function requireMember(options?: { allowPasswordChange?: boolean }) {
  const session = await getSessionProfile();

  if (!session) redirect("/login");

  const profile = session.profile as Profile;

  if (!profile.is_active) {
    redirect("/login?error=deactivated");
  }

  if (profile.must_change_password && !options?.allowPasswordChange) {
    redirect("/profile/password");
  }

  return { user: session.user, profile };
}

/** Guard for /admin. Executives only. */
export async function requireExecutive() {
  const session = await requireMember();
  if (!ADMIN_ROLES.includes(session.profile.role)) {
    redirect("/dashboard?error=forbidden");
  }
  return session;
}

/** Guard for the check-in scanner, which volunteers also operate. */
export async function requireDeskStaff() {
  const session = await requireMember();
  const allowed: Role[] = ["executive", "volunteer"];
  if (!allowed.includes(session.profile.role)) {
    redirect("/dashboard?error=forbidden");
  }
  return session;
}
