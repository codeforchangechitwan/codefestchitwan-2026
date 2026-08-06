import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import { SiteFooter } from "@/components/site-footer";
import { ServiceWorker } from "@/components/service-worker";
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#8b4513" },
    { media: "(prefers-color-scheme: dark)", color: "#1a0f0a" },
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getSessionProfile().catch(() => null);
  const role = (session?.profile?.role ?? null) as Role | null;

  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <SiteHeader
          signedIn={Boolean(session)}
          role={role}
          name={session?.profile?.full_name ?? null}
        />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
        <SiteFooter />
        <BottomNav signedIn={Boolean(session)} role={role} />
        <ServiceWorker />
      </body>
    </html>
  );
}
