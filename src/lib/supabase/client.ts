"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requirePublicSupabase } from "@/lib/env";

export function createClient() {
  const { url, anonKey } = requirePublicSupabase();
  return createBrowserClient(url, anonKey);
}
