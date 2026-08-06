import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  requirePublicSupabase,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from "@/lib/env";

/**
 * Supabase client bound to the request's cookies.
 *
 * `cookies()` is async in Next.js 16, so this helper is async too.
 * In a Server Component the cookie store is read-only; Supabase's token
 * refresh writes are swallowed there because `proxy.ts` already refreshed
 * the session for this request.
 */
export async function createClient() {
  const { url, anonKey } = requirePublicSupabase();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — safe to ignore, see above.
        }
      },
    },
  });
}

/**
 * The signed-in user's profile row, or null when signed out.
 *
 * Also returns null when Supabase isn't configured, so an unconfigured deploy
 * shows the public site and a login prompt rather than a 500 on every
 * protected route.
 */
export async function getSessionProfile() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile ? { user, profile } : null;
}
