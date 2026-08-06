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
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid max-w-5xl grid-cols-5">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
          return (
            <li key={`${href}-${label}`}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                  active ? "text-brand" : "text-muted"
                }`}
              >
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                    active ? "bg-brand-soft" : ""
                  }`}
                >
                  <Icon size={18} aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
