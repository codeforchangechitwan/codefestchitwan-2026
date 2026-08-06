import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <WifiOff size={40} className="text-muted" aria-hidden />
      <h1 className="mt-4 text-xl font-bold">You&rsquo;re offline</h1>
      <p className="mt-2 text-sm text-muted">
        The venue wifi may be busy. Pages you&rsquo;ve already opened still work — your
        identity card QR keeps displaying once it has loaded. Reconnect to see live
        announcements and the leaderboard.
      </p>
    </div>
  );
}
