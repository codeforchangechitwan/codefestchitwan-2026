"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Gamepad2,
  Home,
  Info,
  LogIn,
  MapPin,
  QrCode,
  Shield,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Role } from "@/lib/types";

type Tab = { href: string; label: string; icon: LucideIcon };

const PUBLIC_TABS: Tab[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/venue", label: "Venue", icon: MapPin },
  { href: "/about", label: "About", icon: Info },
  { href: "/login", label: "Log in", icon: LogIn },
];

const MEMBER_TABS: Tab[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/id-card", label: "ID Card", icon: QrCode },
  { href: "/quiz", label: "Quiz", icon: Gamepad2 },
  { href: "/profile", label: "Profile", icon: User },
];

const EXEC_TABS: Tab[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/id-card", label: "ID Card", icon: QrCode },
  { href: "/admin/scan", label: "Scan", icon: QrCode },
  { href: "/admin", label: "Admin", icon: Shield },
];

export function BottomNav({
  signedIn,
  role,
}: {
  signedIn: boolean;
  role: Role | null;
}) {
  const pathname = usePathname();

  const tabs = !signedIn
    ? PUBLIC_TABS
    : role === "executive"
      ? EXEC_TABS
      : MEMBER_TABS;

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-3 mb-3 z-50 rounded-2xl border border-glass bg-surface-glass/85 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] pb-[env(safe-area-inset-bottom)] md:hidden transition-all duration-300"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 items-center p-1.5">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
          return (
            <li key={`${href}-${label}`}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group flex flex-col items-center gap-0.5 py-1 text-[10px] font-semibold transition-all duration-200 active:scale-95 ${
                  active ? "text-brand" : "text-muted hover:text-foreground"
                }`}
              >
                <span
                  className={`relative flex h-8 w-12 items-center justify-center rounded-xl transition-all duration-300 ${
                    active
                      ? "bg-gradient-to-r from-brand/25 to-accent/25 text-brand shadow-[0_0_12px_rgb(var(--brand-rgb)/0.4)] border border-brand/30 scale-105"
                      : "group-hover:bg-surface-glass-hover"
                  }`}
                >
                  <Icon
                    size={19}
                    aria-hidden
                    className={`transition-transform duration-300 ${
                      active ? "scale-110 stroke-[2.5px]" : "stroke-[1.8px]"
                    }`}
                  />
                  {active && (
                    <span className="absolute -top-1 h-1 w-2 rounded-full bg-brand shadow-[0_0_6px_rgb(var(--brand-rgb))]" />
                  )}
                </span>
                <span className="truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
