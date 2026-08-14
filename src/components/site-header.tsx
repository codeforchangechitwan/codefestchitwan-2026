"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, LogIn, Sparkles, ChevronRight, UserCheck } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ROLE_LABELS, type Role } from "@/lib/types";

const PUBLIC_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/schedule", label: "Schedule" },
  { href: "/judging", label: "Judging" },
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

  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const navLinks = signedIn ? MEMBER_LINKS : PUBLIC_LINKS;

  return (
    <header className="glass-header sticky top-0 z-50 w-full border-b border-border-glass bg-surface-glass/80 backdrop-blur-xl transition-all duration-300 shadow-glass">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Brand Logo & Title with Glass Badge */}
        <Link
          href="/"
          className="group flex items-center gap-3 transition-transform duration-200 hover:scale-[1.02]"
        >
          <div className="relative flex items-center justify-center rounded-xl border border-glass bg-surface-muted/60 p-1.5 shadow-inner transition-colors duration-300 group-hover:border-brand/40 group-hover:shadow-[0_0_15px_rgb(var(--brand-rgb)/0.3)]">
            <Image
              src="/brand/cfc-logo.png"
              alt="Code for Change"
              width={104}
              height={52}
              className="h-7 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="bg-gradient-to-r from-brand via-accent to-gold-glow bg-clip-text text-base font-extrabold tracking-tight text-transparent drop-shadow-sm sm:text-lg">
              Codefest Chitwan
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">
              2026 Hackathon
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(`${link.href}/`));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`hover-rise relative rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-brand/20 to-accent/20 text-brand border border-brand/30 shadow-[0_0_12px_rgb(var(--brand-rgb)/0.25)] font-semibold"
                    : "text-muted hover:bg-surface-glass-hover hover:text-foreground hover:border hover:border-white/5"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Action Buttons & Theme Toggle */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {!signedIn ? (
            <Link
              href="/login"
              className="btn-primary-glass hidden items-center gap-2 px-4 py-2 text-sm font-semibold sm:inline-flex"
            >
              <LogIn size={16} aria-hidden />
              <span>Log In</span>
            </Link>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              {role === "executive" && (
                <Link
                  href="/admin"
                  className="rounded-xl border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-bold text-brand transition-all hover:bg-brand/20 hover:shadow-[0_0_12px_rgb(var(--brand-rgb)/0.3)]"
                >
                  Admin Panel
                </Link>
              )}
            </div>
          )}

          {/* Mobile Drawer Trigger */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex items-center justify-center rounded-xl border border-glass bg-surface-glass p-2 text-muted transition-all duration-200 hover:bg-surface-glass-hover hover:text-foreground hover:border-brand/30 md:hidden active:scale-95"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {open && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200 border-t border-border-glass bg-surface/95 backdrop-blur-2xl md:hidden">
          <div className="mx-auto w-full max-w-5xl px-4 py-4 space-y-3">
            {signedIn && name && (
              <div className="glass-card flex items-center justify-between p-3 border-brand/20 bg-brand/5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/20 text-brand">
                    <UserCheck size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{name}</p>
                    <p className="text-xs text-muted">
                      {role ? ROLE_LABELS[role] : "Participant"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <nav className="grid gap-1.5">
              {navLinks.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== "/" && pathname.startsWith(`${link.href}/`));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-brand/20 to-accent/20 text-brand border border-brand/30 font-semibold"
                        : "text-foreground hover:bg-surface-muted hover:text-brand"
                    }`}
                  >
                    <span>{link.label}</span>
                    <ChevronRight size={16} className="opacity-50" />
                  </Link>
                );
              })}

              {role === "executive" && (
                <Link
                  href="/admin"
                  className="flex items-center justify-between rounded-xl border border-brand/30 bg-brand/10 px-4 py-3 text-sm font-bold text-brand hover:bg-brand/20"
                >
                  <span>Admin Panel</span>
                  <Sparkles size={16} />
                </Link>
              )}

              {signedIn ? (
                <form action="/auth/signout" method="post" className="pt-2">
                  <button
                    type="submit"
                    className="w-full rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-left text-sm font-semibold text-danger transition-all hover:bg-danger/20"
                  >
                    Sign Out
                  </button>
                </form>
              ) : (
                <Link
                  href="/login"
                  className="btn-primary-glass mt-2 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white"
                >
                  <LogIn size={16} />
                  <span>Log In to Portal</span>
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
