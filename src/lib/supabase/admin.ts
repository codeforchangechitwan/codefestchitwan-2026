import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requirePublicSupabase, requireServiceRoleKey } from "@/lib/env";

/**
 * Service-role client. Bypasses RLS, so it must never be imported into a
 * Client Component — `server-only` makes that a build error.
 *
 * Used for the two things the anon key genuinely cannot do: creating auth
 * users for pre-registered members, and grading quiz attempts against answer
 * keys the browser is not allowed to see.
 */
export function createAdminClient() {
  const { url } = requirePublicSupabase();
  return createSupabaseClient(url, requireServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
