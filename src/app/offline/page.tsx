import type { Metadata } from "next";
import { WifiOff, ShieldCheck } from "lucide-react";
import { RetryButton } from "@/components/retry-button";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="relative min-h-[75vh] flex items-center justify-center px-4 py-16 max-w-md mx-auto text-center">
      {/* Background Glow */}
      <div className="ambient-glow top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[250px] opacity-20" />

      <div className="glass-card p-8 border-glass bg-surface-glass backdrop-blur-2xl shadow-2xl w-full">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-muted border border-glass text-muted mb-4 animate-pulse">
          <WifiOff size={32} />
        </div>

        <h1 className="text-2xl font-black tracking-tight text-foreground">You are currently offline</h1>
        <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed">
          The venue wifi network may be overloaded. Previously opened pages and your <strong className="text-foreground">Digital ID Card QR</strong> remain accessible offline.
        </p>

        <div className="mt-6 pt-4 border-t border-border/50 text-left space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted">
            <ShieldCheck size={14} className="text-emerald-glow shrink-0" />
            Identity Card QR cached locally
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <ShieldCheck size={14} className="text-emerald-glow shrink-0" />
            Static schedule cached locally
          </div>
        </div>

        <RetryButton />
      </div>
    </div>
  );
}

