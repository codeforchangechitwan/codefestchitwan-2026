/**
 * Service-role client for the scripts, plus the .env.local loader they all
 * need before they can build one.
 *
 * The three older import scripts each carry their own copy of this preamble.
 * They are proven against the live event data and are deliberately left alone;
 * new scripts import this instead of adding a fourth copy.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

export function loadEnv(file = ".env.local") {
  let raw;
  try {
    raw = readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    process.env[match[1]] ??= match[2].trim().replace(/^["']|["']$/g, "");
  }
}

/** Exits with a readable message rather than a stack trace when unconfigured. */
export function serviceClient() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — copy .env.example to .env.local and fill them in.",
    );
    process.exit(1);
  }

  return createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
