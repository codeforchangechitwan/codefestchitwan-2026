"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

/*
 * The `data-theme` attribute on <html> is the source of truth: the inline
 * script in the root layout sets it before paint, and the button below writes
 * to it. Subscribing to that attribute (rather than mirroring it into state in
 * an effect) keeps the icon correct without a cascading render.
 */

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);

  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
  };
}

function getSnapshot(): Theme {
  const attribute = document.documentElement.getAttribute("data-theme");
  if (attribute === "light" || attribute === "dark") return attribute;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** No theme is known on the server, so the icon renders as a placeholder. */
function getServerSnapshot(): Theme | null {
  return null;
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("cf-theme", next);
    } catch {
      // Private browsing — the theme still applies for this session.
    }
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        isDark ? "Switch to light theme" : "Switch to dark theme"
      }
      className="group relative flex h-9 w-9 items-center justify-center rounded-xl border border-glass bg-surface-glass/80 text-muted backdrop-blur-md transition-all duration-300 hover:border-brand/40 hover:bg-surface-glass-hover hover:text-foreground hover:shadow-[0_0_15px_rgb(var(--brand-rgb)/0.3)] active:scale-95"
    >
      <span className="sr-only">Toggle theme</span>
      <div className="relative flex items-center justify-center transition-transform duration-500 group-hover:rotate-45">
        {isDark ? (
          <Sun size={18} className="text-amber-400 transition-colors group-hover:text-amber-300" />
        ) : (
          <Moon size={18} className="text-brand transition-colors group-hover:text-brand-strong" />
        )}
      </div>
      <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand/10 to-accent/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 -z-10" />
    </button>
  );
}
