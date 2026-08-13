/**
 * Environment access.
 *
 * Public values are read at module scope so Next can inline them into the
 * client bundle. Secrets are read lazily through helpers so that a missing
 * secret only breaks the server path that actually needs it, rather than
 * failing the whole build.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/*
 * The public origin. Identity-card QRs encode it, so a wrong value here gets
 * printed onto paper badges that resolve nowhere.
 *
 * NEXT_PUBLIC_SITE_URL still wins, and setting it in the hosting environment
 * remains the right thing to do. What changed is what happens when nobody
 * does. This shipped to production twice:
 *
 *   1. with no fallback logic at all, so og:image and every card generated
 *      server-side pointed at http://localhost:3000;
 *   2. with a VERCEL_PROJECT_PRODUCTION_URL fallback, which turned out to be
 *      inert — that system variable only exists when a project has
 *      "Automatically expose System Environment Variables" enabled, and this
 *      one does not. The bug survived the fix.
 *
 * So the production default is now the origin itself rather than anything
 * inferred at runtime. Hardcoding a domain in source is not elegant, but the
 * alternative has twice been a live site advertising a laptop, and the failure
 * is invisible until somebody scans a printed badge at the registration desk.
 * NODE_ENV is set to "production" by `next build` unconditionally, with no
 * project setting to forget.
 */
const PRODUCTION_ORIGIN = "https://codefestchitwan-2026.vercel.app";

const FALLBACK_ORIGIN =
  process.env.NODE_ENV === "production" ? PRODUCTION_ORIGIN : "http://localhost:3000";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_ORIGIN
).replace(/\/+$/, "");

export function requirePublicSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill them in.",
    );
  }
  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
}

export function requireServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Admin actions (creating members, mailing passwords) need it.",
    );
  }
  return key;
}

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

export function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT ?? 587);
  return {
    host,
    port,
    // Implicit TLS on 465; STARTTLS everywhere else.
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    user,
    pass,
    from: process.env.SMTP_FROM ?? "Codefest Chitwan <no-reply@codefestnepal.com>",
  };
}
