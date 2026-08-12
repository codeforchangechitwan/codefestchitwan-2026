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
 * The public origin. Identity-card QRs encode it, so a wrong value here is
 * printed onto paper badges that resolve nowhere.
 *
 * The localhost fallback exists so `npm run dev` works before .env.local is
 * filled in — but it shipped to production once already, where og:image and
 * every generated card pointed at http://localhost:3000. Falling back
 * silently in a production build is therefore treated as the bug it is:
 * VERCEL_PROJECT_PRODUCTION_URL is injected by Vercel on every deployment, so
 * an unset variable degrades to the deployment's own origin instead of to a
 * laptop.
 */
const FALLBACK_ORIGIN = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

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
