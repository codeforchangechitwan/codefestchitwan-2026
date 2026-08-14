"use client";

import Link from "next/link";
import { Timer } from "lucide-react";
import { HackClock } from "@/components/hack-clock";
import type { HackathonState } from "@/lib/hackathon";
import { useHackathon } from "@/lib/use-hackathon";

/**
 * The clock on the dashboard, where people already are.
 *
 * Renders nothing until the clock is actually started, so the dashboard stays
 * quiet all Friday morning and the countdown APPEARING is itself the signal
 * that hacking has begun — it arrives on the `event` pulse within a second of
 * the coordinator pressing the button, on every device with the tab open.
 */
export function HackStrip({ initial }: { initial: HackathonState }) {
  const { data } = useHackathon(initial);

  if (data.status === "idle") return null;

  const finished = data.status === "finished";

  return (
    <Link
      href="/hackathon"
      className={`mt-6 flex items-center gap-4 rounded-2xl border px-4 py-3 transition-colors ${
        finished
          ? "border-danger/30 bg-danger/5 hover:border-danger/50"
          : "border-brand/30 bg-brand-soft hover:border-brand/60"
      }`}
    >
      <Timer
        size={18}
        className={finished ? "shrink-0 text-danger" : "shrink-0 text-brand"}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold uppercase tracking-wide text-muted">
          {finished ? "Hacking has ended" : "Time remaining"}
        </span>
        <HackClock
          endsAt={data.endsAt}
          skewMs={data.skewMs}
          className="block text-2xl font-extrabold leading-tight"
        />
      </span>
    </Link>
  );
}
