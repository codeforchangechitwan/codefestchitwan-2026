"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, RotateCcw, Scissors, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLiveQuery } from "@/lib/use-live-query";
import { cutRibbon, resetRibbon } from "./actions";

export type CeremonyState = {
  ceremonyTitle: string | null;
  chiefGuestName: string | null;
  chiefGuestTitle: string | null;
  ribbonCutAt: string | null;
  cutByName: string | null;
  secondsSinceCut: number | null;
};

/**
 * A phone that loads two hours after the cut should say "under way", not throw
 * confetti. Anything fresher than this is treated as "it just happened".
 */
const CELEBRATE_WINDOW_S = 90;

async function readCeremony(): Promise<CeremonyState> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("ceremony_state");
  const row = Array.isArray(data) ? data[0] : null;
  if (error || !row) throw error ?? new Error("no ceremony row");

  return {
    ceremonyTitle: row.ceremony_title,
    chiefGuestName: row.chief_guest_name,
    chiefGuestTitle: row.chief_guest_title,
    ribbonCutAt: row.ribbon_cut_at,
    cutByName: row.cut_by_name,
    secondsSinceCut: row.seconds_since_cut,
  };
}

export function RibbonView({
  initial,
  canControl,
}: {
  initial: CeremonyState;
  canControl: boolean;
}) {
  const { data, live, stale } = useLiveQuery({
    topics: ["event"],
    initial,
    // Straight to Supabase. The projector and every phone watching re-read
    // here, and none of it touches the Next server.
    fetcher: readCeremony,
  });

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const isCut = Boolean(data.ribbonCutAt);

  /**
   * Celebrate only on the transition, and only if the cut is recent. A device
   * that was already showing "cut" when this mounted has seen it.
   */
  const [celebrating, setCelebrating] = useState(false);
  const wasCut = useRef(isCut);
  useEffect(() => {
    const fresh = (data.secondsSinceCut ?? Infinity) <= CELEBRATE_WINDOW_S;
    if (isCut && !wasCut.current && fresh) {
      setCelebrating(true);
      const id = setTimeout(() => setCelebrating(false), 9000);
      return () => clearTimeout(id);
    }
    wasCut.current = isCut;
  }, [isCut, data.secondsSinceCut]);

  function doCut() {
    setError(null);
    startTransition(async () => {
      const result = await cutRibbon();
      if (!result.ok) setError(result.message);
    });
  }

  function doReset() {
    setError(null);
    startTransition(async () => {
      const result = await resetRibbon();
      if (!result.ok) setError(result.message);
      setConfirmReset(false);
      wasCut.current = false;
    });
  }

  return (
    <div className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 py-10 text-center">
      {celebrating && <Confetti />}

      <p className="text-xs font-bold uppercase tracking-[0.3em] text-muted">
        {isCut ? "Now under way" : "Inauguration"}
      </p>

      <h1 className="mt-3 text-balance text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
        {data.ceremonyTitle?.trim() || "Codefest Chitwan 2026"}
      </h1>

      {/* The ribbon ------------------------------------------------------- */}
      <div className="relative mt-10 w-full max-w-3xl" aria-hidden>
        <div className="relative h-14">
          {/* Two halves that part when cut. Transform-only, so it stays
              smooth on the venue laptop, and it simply lands in the parted
              position when reduced motion is on. */}
          <span
            className={`absolute left-0 top-1/2 h-8 w-1/2 -translate-y-1/2 rounded-l-full bg-gradient-to-r from-brand to-brand-strong shadow-lg transition-transform duration-[1400ms] ease-out ${
              isCut ? "-translate-x-[62%] -rotate-6" : ""
            }`}
          />
          <span
            className={`absolute right-0 top-1/2 h-8 w-1/2 -translate-y-1/2 rounded-r-full bg-gradient-to-l from-brand to-brand-strong shadow-lg transition-transform duration-[1400ms] ease-out ${
              isCut ? "translate-x-[62%] rotate-6" : ""
            }`}
          />
          <span
            className={`absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-brand bg-bg transition-all duration-700 ${
              isCut ? "scale-0 opacity-0" : "scale-100 opacity-100"
            }`}
          >
            <Scissors size={24} className="text-brand" />
          </span>
        </div>
      </div>

      {/* Chief guest ------------------------------------------------------ */}
      <div className="mt-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted">
          Chief Guest
        </p>
        <p className="mt-2 text-2xl font-bold sm:text-3xl">
          {data.chiefGuestName?.trim() || "To be announced"}
        </p>
        {data.chiefGuestTitle?.trim() && (
          <p className="mt-1 text-sm text-muted sm:text-base">
            {data.chiefGuestTitle}
          </p>
        )}
      </div>

      {isCut && (
        <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-5 py-2.5 text-sm font-semibold text-success">
          <Sparkles size={16} aria-hidden />
          The ribbon is cut — Codefest Chitwan 2026 has begun
        </p>
      )}

      {/* Controls --------------------------------------------------------- */}
      {canControl && (
        <div className="mt-10 w-full max-w-sm">
          {error && (
            <p className="mb-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          )}

          {!isCut ? (
            <button
              type="button"
              onClick={doCut}
              disabled={pending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-5 text-lg font-bold text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
            >
              {pending ? (
                <Loader2 size={20} className="animate-spin" aria-hidden />
              ) : (
                <Scissors size={20} aria-hidden />
              )}
              Cut the ribbon
            </button>
          ) : confirmReset ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={doReset}
                disabled={pending}
                className="flex-1 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger disabled:opacity-60"
              >
                Really un-cut the ribbon?
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              disabled={pending}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-xs font-semibold text-muted transition-colors hover:border-brand/40 disabled:opacity-60"
            >
              <RotateCcw size={14} aria-hidden />
              Reset (rehearsal)
            </button>
          )}
        </div>
      )}

      {/* Connection state, quiet unless it matters. */}
      <p className="mt-8 text-[11px] text-muted">
        {stale
          ? "Reconnecting…"
          : live
            ? "Live on every device"
            : "Live updates unavailable — refreshing on a timer"}
        {data.cutByName && isCut && ` · started by ${data.cutByName}`}
      </p>
    </div>
  );
}

/** Deterministic 0..1 spread — a hash, not a sequence, so neighbours differ. */
function scatter(index: number, salt: number) {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const PIECES = Array.from({ length: 60 }, (_, i) => ({
  left: scatter(i, 1) * 100,
  delay: scatter(i, 2) * 1.2,
  duration: 3.4 + scatter(i, 3) * 2.2,
  rotate: scatter(i, 4) * 360,
  hue: [0, 38, 152, 210, 280][i % 5],
}));

/**
 * Cheap confetti: 60 absolutely-positioned pieces animating transform and
 * opacity only. No canvas, no library, and the global reduced-motion rule in
 * globals.css collapses it to a still frame rather than a seizure risk.
 */
function Confetti() {
  /**
   * Scattered by a cheap integer hash of the index rather than Math.random():
   * pure, so it renders identically on server and client and does not trip the
   * impure-during-render rule, and the eye cannot tell the difference.
   */
  const pieces = PIECES;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((piece, index) => (
        <span
          key={index}
          className="absolute top-[-8%] h-3 w-2 rounded-[2px]"
          style={{
            left: `${piece.left}%`,
            backgroundColor: `hsl(${piece.hue} 85% 58%)`,
            transform: `rotate(${piece.rotate}deg)`,
            animation: `ribbon-fall ${piece.duration}s linear ${piece.delay}s forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes ribbon-fall {
          to { transform: translateY(115svh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
