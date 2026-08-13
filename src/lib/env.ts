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
 * NEXT_PUBLIC_SITE_URL wins over everything below, by design.
 *
 * READ THIS BEFORE CHANGING THE FALLBACK AGAIN. Production served
 * og:url = http://localhost:3000 for a long time and two fallback rewrites
 * failed to fix it, because the fallback was never what was broken: the
 * Vercel project has NEXT_PUBLIC_SITE_URL *set*, to http://localhost:3000.
 * An explicit value beat both attempts, exactly as it should.
 *
 * The evidence, so nobody re-diagnoses it from scratch: a production build of
 * this file with the variable unset emits the correct origin, and the
 * deployment carrying that build still emitted localhost. Only an explicit
 * environment value explains both. Fix it in the Vercel project settings —
 * either correct it or delete it, since deleting it now lands here.
 *
 * The default below is still worth having for the genuinely-unset case: a
 * hardcoded domain in source is inelegant, but the alternative was a live site
 * advertising a laptop, and the failure is invisible until somebody scans a
 * printed badge at the registration desk. NODE_ENV is set by `next build`
 * unconditionally, so this needs no project setting to work.
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
