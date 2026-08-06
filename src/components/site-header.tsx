"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, LogIn } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ROLE_LABELS, type Role } from "@/lib/types";

const PUBLIC_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/schedule", label: "Schedule" },
  { href: "/venue", label: "Venue" },
  { href: "/partners", label: "Partners" },
  { href: "/contact", label: "Contact" },
];

const MEMBER_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/id-card", label: "My ID Card" },
  { href: "/quiz", label: "Quiz & Games" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/announcements", label: "Announcements" },
  { href: "/profile", label: "Profile" },
];

export function SiteHeader({
  signedIn,
  role,
  name,
}: {
  signedIn: boolean;
  role: Role | null;
  name: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever the route changes. Adjusting state during render
  // (rather than in an effect) avoids a second render pass showing the old
  // drawer on the new page.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  // Prevent the page behind the drawer from scrolling.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/75">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 min-w-0">
          <Image
            src="/brand/cfc-logo.png"
            alt="Code for Change"
            width={104}
            height={52}
            className="h-7 w-auto"
            priority
          />
          <span className="sr-only">Codefest Chitwan 2026</span>
          <span
            aria-hidden
            className="hidden truncate text-sm font-bold tracking-tight text-brand sm:block"
          >
            Codefest Chitwan 2026
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {(signedIn ? MEMBER_LINKS : PUBLIC_LINKS).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "bg-brand-soft text-brand"
                  : "text-muted hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 md:ml-2">
          <ThemeToggle />

          {!signedIn && (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong"
            >
              <LogIn size={15} aria-hidden />
              Log in
            </Link>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="rounded-lg p-2 text-muted hover:bg-surface-muted hover:text-foreground md:hidden"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-surface md:hidden">
          <div className="mx-auto w-full max-w-5xl px-4 py-3">
            {signedIn && name && (
              <p className="mb-2 text-xs text-muted">
                Signed in as <span className="font-semibold text-foreground">{name}</span>
                {role ? ` · ${ROLE_LABELS[role]}` : ""}
              </p>
            )}
            <nav className="grid gap-1">
              {(signedIn ? MEMBER_LINKS : PUBLIC_LINKS).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                    pathname === link.href
                      ? "bg-brand-soft text-brand"
                      : "text-foreground hover:bg-surface-muted"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {role === "executive" && (
                <Link
                  href="/admin"
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-navy hover:bg-surface-muted"
                >
                  Admin panel
                </Link>
              )}
              {signedIn ? (
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-danger hover:bg-surface-muted"
                  >
                    Sign out
                  </button>
                </form>
              ) : (
                <Link
                  href="/schedule"
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-muted"
                >
                  Event schedule
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
