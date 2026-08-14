"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Loader2, RotateCcw, Sparkles } from "lucide-react";
import { drawNext, resetDraw, type DrawMode, type DrawResult } from "./actions";

type Entry = { id: string; code: string; name: string; slot: number };

const ITEM_H = 88;
const SPIN_MS = 3500;
/** How many decoy names scroll past before the winner lands. */
const RUNWAY = 22;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function shuffled<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function Wheel({
  mode,
  undrawn,
  alreadyDrawn,
}: {
  mode: DrawMode;
  undrawn: { id: string; code: string; name: string }[];
  alreadyDrawn: Entry[];
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  /** Every team in this ceremony, drawn or not. Fixed for the life of the
   *  mount, so a reset can restore the count without double-counting the
   *  teams drawn since the page loaded. */
  const total = undrawn.length + alreadyDrawn.length;

  const [drawn, setDrawn] = useState<Entry[]>(alreadyDrawn);
  const [remaining, setRemaining] = useState(undrawn.length);
  const [winner, setWinner] = useState<Entry | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [reel, setReel] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const animateTo = useCallback((names: string[], onDone: () => void) => {
    const el = stripRef.current;
    if (!el) {
      onDone();
      return;
    }

    const target = RUNWAY * ITEM_H;
    const start = performance.now();

    const frame = (now: number) => {
      const p = Math.min(1, (now - start) / SPIN_MS);
      const eased = 1 - Math.pow(1 - p, 3);
      el.style.transform = `translate3d(0, ${-(eased * target)}px, 0)`;
      if (p < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        rafRef.current = null;
        onDone();
      }
    };

    setReel(names);
    el.style.transform = "translate3d(0, 0, 0)";
    rafRef.current = requestAnimationFrame(frame);
  }, []);

  function spin() {
    setError(null);
    setWinner(null);

    startTransition(async () => {
      const result: DrawResult = await drawNext(mode);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      const entry: Entry = {
        id: result.teamId,
        code: result.teamCode,
        name: result.teamName,
        slot: result.slot,
      };

      const settle = () => {
        setWinner(entry);
        setSpinning(false);
        setDrawn((current) => [...current, entry]);
        setRemaining(result.leftToDraw);
      };

      // Reduced motion: the result is already committed in Postgres, so
      // revealing it immediately is the correct behaviour, not a degradation.
      if (prefersReducedMotion()) {
        settle();
        return;
      }

      // Decoys come from the teams still in the hat at this moment, not the
      // list the page loaded with — otherwise the reel scrolls past names that
      // were already called earlier in the same ceremony.
      const stillIn = new Set(drawn.map((entry) => entry.id));
      const pool = undrawn.filter((team) => !stillIn.has(team.id));
      const decoys = shuffled((pool.length > 0 ? pool : undrawn).map((t) => t.name));
      const names: string[] = [];
      for (let i = 0; i < RUNWAY; i += 1) {
        names.push(decoys[i % Math.max(decoys.length, 1)] ?? entry.name);
      }
      names.push(entry.name);

      setSpinning(true);
      animateTo(names, settle);
    });
  }

  function doReset() {
    startTransition(async () => {
      const result = await resetDraw(mode);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setDrawn([]);
      setWinner(null);
      setRemaining(total);
      setConfirmReset(false);
    });
  }

  const label = mode === "pitch" ? "pitch slot" : "table";
  const busy = pending || spinning;

  return (
    <div className="grid gap-5">
      {/* Reel ------------------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface">
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 border-y-2 border-brand"
          style={{ height: ITEM_H }}
          aria-hidden
        />

        <div className="relative" style={{ height: ITEM_H * 3 }}>
          <div
            className="absolute inset-x-0"
            style={{ top: ITEM_H }}
            aria-hidden={spinning}
          >
            <div ref={stripRef} className="will-change-transform">
              {spinning ? (
                reel.map((name, index) => (
                  <div
                    key={`${name}-${index}`}
                    className="flex items-center justify-center px-4 text-center text-2xl font-bold"
                    style={{ height: ITEM_H }}
                  >
                    {name}
                  </div>
                ))
              ) : (
                <div
                  className="flex flex-col items-center justify-center px-4 text-center"
                  style={{ height: ITEM_H }}
                >
                  {winner ? (
                    <>
                      <p className="text-2xl font-extrabold leading-tight text-brand">
                        {winner.name}
                      </p>
                      <p className="mt-0.5 font-mono text-xs tracking-widest text-muted">
                        {winner.code} · {label} {winner.slot}
                      </p>
                    </>
                  ) : (
                    <p className="text-lg font-semibold text-muted">
                      {remaining === 0 ? "Every team has a slot" : "Ready to draw"}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* The announcement, separate from the decorative strip. */}
      <p aria-live="polite" className="sr-only">
        {winner ? `${winner.name}, ${label} ${winner.slot}` : ""}
      </p>

      {error && (
        <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="grid gap-2">
        <button
          type="button"
          onClick={spin}
          disabled={busy || remaining === 0}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-4 text-base font-bold text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
        >
          {busy ? (
            <Loader2 size={18} className="animate-spin" aria-hidden />
          ) : (
            <Sparkles size={18} aria-hidden />
          )}
          {remaining === 0 ? "Draw complete" : `Draw next (${remaining} left)`}
        </button>

        {confirmReset ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={doReset}
              disabled={pending}
              className="flex-1 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger disabled:opacity-60"
            >
              Really clear every {label}?
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold hover:border-brand/40"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            disabled={busy || drawn.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold transition-colors hover:border-brand/40 disabled:opacity-60"
          >
            <RotateCcw size={15} aria-hidden />
            Reset the draw
          </button>
        )}
      </div>

      <p className="text-center text-xs leading-relaxed text-muted">
        The winner is drawn and saved by the database before the reel starts
        moving. Refreshing mid-spin shows the same result.
      </p>

      {/* Board ------------------------------------------------------------ */}
      {drawn.length > 0 && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
            Drawn so far ({drawn.length})
          </h2>
          <ol className="mt-3 grid gap-2">
            {[...drawn]
              .sort((a, b) => a.slot - b.slot)
              .map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft font-mono text-sm font-bold text-brand">
                    {entry.slot}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold leading-tight">
                      {entry.name}
                    </span>
                    <span className="block font-mono text-xs text-muted">
                      {entry.code}
                    </span>
                  </span>
                </li>
              ))}
          </ol>
        </div>
      )}
    </div>
  );
}
