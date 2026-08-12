"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

/**
 * Offers to install the app to the home screen.
 *
 * Worth prompting for at this event specifically: the venue wifi is the weak
 * point every year, the installed app has a service worker and the browser tab
 * does not, and the thing people need at the door — their identity card — is
 * the thing they need when the network is worst.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Same `cf-` prefix as the theme key. */
const DISMISSED_KEY = "cf-install-dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Chrome fires this only when the app is installable and not yet
    // installed, so there is no separate "already installed" check to do.
    try {
      if (localStorage.getItem(DISMISSED_KEY) === "1") return;
    } catch {
      // Storage blocked (private mode, or a locked-down browser). Prompting is
      // harmless without it — the dismissal just will not persist.
    }

    const handler = (event: Event) => {
      // Keeps the browser's own mini-infobar from covering the bottom nav.
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      // Let people read the page before asking them to install it.
      setTimeout(() => setVisible(true), 4000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    setVisible(false);
    setDeferred(null);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // See above.
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    // A single prompt is all the browser gives us, accepted or not.
    setVisible(false);
    setDeferred(null);
    if (outcome === "accepted") {
      try {
        localStorage.setItem(DISMISSED_KEY, "1");
      } catch {
        // See above.
      }
    }
  }

  if (!visible || !deferred) return null;

  return (
    // Sits above the bottom nav on phones and clears it entirely from md up.
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 md:bottom-4">
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-lg">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"
          aria-hidden
        >
          <Download size={18} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold leading-tight">
            Install Codefest 2026
          </span>
          <span className="block text-xs leading-relaxed text-muted">
            Your card and the schedule, working without signal.
          </span>
        </span>

        <button
          type="button"
          onClick={install}
          className="shrink-0 rounded-xl bg-brand px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-brand-strong"
        >
          Install
        </button>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:text-foreground"
        >
          <X size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
