import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import { SiteFooter } from "@/components/site-footer";
import { ServiceWorker } from "@/components/service-worker";
import { InstallPrompt } from "@/components/install-prompt";
import { getSessionProfile } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/env";
import type { Role } from "@/lib/types";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Codefest Chitwan 2026 — Hackathon",
    template: "%s · Codefest Chitwan 2026",
  },
  description:
    "Codefest 2026 Hackathon at Forbes College Chitwan, 14–16 August. Schedule, venue, identity cards, quizzes and live updates for participants, mentors, judges and volunteers.",
  applicationName: "Codefest Chitwan 2026",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Codefest 2026",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "Codefest Chitwan 2026 — Hackathon",
    description:
      "14–16 August · Forbes College, Bharatpur-2, Kshetrapur · Total prize pool NPR 3,00,000",
    url: SITE_URL,
    siteName: "Codefest Chitwan 2026",
    images: ["/brand/chitwan-poster.jpg"],
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  /*
   * Declaring both schemes at the document level stops Chrome for Android from
   * applying its "Auto Dark Theme" force-darkening. Without it, a phone in OS
   * dark mode viewing the light theme (whose root is `color-scheme: light`)
   * gets its colors rewritten by the browser: solid and gradient buttons are
   * darkened to near-black while their hardcoded white labels are left alone,
   * so the labels vanish. The per-theme `color-scheme` in globals.css still
   * decides how native controls actually render.
   */
  colorScheme: "dark light",
  /* Must track --background in globals.css; these were left on an older palette. */
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff8f3" },
    { media: "(prefers-color-scheme: dark)", color: "#140c07" },
  ],
};

/** Applies the saved theme before paint so there is no light/dark flash. */
const THEME_SCRIPT = `
(function () {
  try {
    var saved = localStorage.getItem('cf-theme');
    if (saved === 'light' || saved === 'dark') {
      document.documentElement.setAttribute('data-theme', saved);
    }
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionProfile().catch(() => null);
  const role = (session?.profile?.role ?? null) as Role | null;

  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="relative min-h-full flex flex-col font-sans bg-background text-foreground selection:bg-brand/30 selection:text-brand">
        {/* Ambient Background Radial Glows */}
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
        >
          {/* Top-left Brand Radial Glow */}
          <div className="ambient-glow animate-pulse-glow -top-32 -left-32 w-[35rem] h-[35rem] opacity-60 dark:opacity-40" />

          {/* Top-right Accent Glow */}
          <div className="ambient-glow animate-pulse-glow top-1/4 -right-32 w-[30rem] h-[30rem] bg-accent/20 blur-[100px] opacity-50 dark:opacity-30" />

          {/* Bottom-left Cyan Glow */}
          <div className="ambient-glow animate-pulse-glow bottom-10 left-1/3 w-[40rem] h-[40rem] bg-gold-glow/15 blur-[120px] opacity-40 dark:opacity-20" />
        </div>

        {/* Header, Main Content & Footer Container */}
        <div className="relative z-10 flex min-h-full flex-col">
          <SiteHeader
            signedIn={Boolean(session)}
            role={role}
            name={session?.profile?.full_name ?? null}
          />
          <main className="flex-1 pb-20 md:pb-0 w-full relative overflow-x-hidden">
            {children}
          </main>
          <SiteFooter />
          <BottomNav signedIn={Boolean(session)} role={role} />
        </div>

        <ServiceWorker />
        <InstallPrompt />
      </body>
    </html>
  );
}
