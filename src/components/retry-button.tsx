"use client";

import { RefreshCw } from "lucide-react";

export function RetryButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="btn-primary-glass mt-6 w-full py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
    >
      <RefreshCw size={14} /> Retry Connection
    </button>
  );
}
