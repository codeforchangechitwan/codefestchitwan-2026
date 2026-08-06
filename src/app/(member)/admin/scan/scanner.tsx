"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  CameraOff,
  Loader2,
  ScanLine,
  TriangleAlert,
} from "lucide-react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { ROLE_COLORS, ROLE_LABELS } from "@/lib/types";
import { lookupCard, type ScanLookup } from "./actions";
import { checkIn } from "../../verify/[token]/actions";

type Status = "idle" | "starting" | "scanning" | "denied" | "unsupported";

export function Scanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const busyRef = useRef(false);

  const [status, setStatus] = useState<Status>("idle");
  const [lookup, setLookup] = useState<ScanLookup | null>(null);
  const [checkInMessage, setCheckInMessage] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [manual, setManual] = useState("");

  const stop = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setStatus("idle");
  }, []);

  const handlePayload = useCallback(
    async (payload: string) => {
      // One lookup at a time — the camera fires many frames per second.
      if (busyRef.current) return;
      busyRef.current = true;

      const result = await lookupCard(payload);
      setLookup(result);
      setCheckInMessage(null);

      if (result.ok) {
        // Pause scanning while the operator reads the card.
        stop();
      }

      busyRef.current = false;
    },
    [stop],
  );

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }

    setStatus("starting");
    setLookup(null);
    setCheckInMessage(null);

    try {
      const reader = new BrowserQRCodeReader();
      controlsRef.current = await reader.decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current!,
        (result) => {
          if (result) void handlePayload(result.getText());
        },
      );
      setStatus("scanning");
    } catch {
      setStatus("denied");
    }
  }, [handlePayload]);

  useEffect(() => () => controlsRef.current?.stop(), []);

  async function confirmCheckIn(token: string) {
    setCheckingIn(true);
    const result = await checkIn(token);
    setCheckInMessage(result.message);
    setCheckingIn(false);
  }

  return (
    <div className="grid gap-4">
      {/* Camera ---------------------------------------------------------- */}
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-black">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          muted
          playsInline
        />

        {status !== "scanning" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface p-6 text-center">
            {status === "denied" ? (
              <>
                <CameraOff size={28} className="text-danger" aria-hidden />
                <p className="text-sm text-muted">
                  Camera access was refused. Allow it in your browser settings, or type
                  the card ID below.
                </p>
              </>
            ) : status === "unsupported" ? (
              <>
                <CameraOff size={28} className="text-warning" aria-hidden />
                <p className="text-sm text-muted">
                  This browser can&rsquo;t open the camera. Use the manual entry below.
                </p>
              </>
            ) : status === "starting" ? (
              <>
                <Loader2 size={26} className="animate-spin text-brand" aria-hidden />
                <p className="text-sm text-muted">Starting camera…</p>
              </>
            ) : (
              <>
                <ScanLine size={28} className="text-brand" aria-hidden />
                <p className="text-sm text-muted">
                  Ready when you are. The camera only runs while you&rsquo;re scanning.
                </p>
              </>
            )}

            <button
              type="button"
              onClick={() => void start()}
              className="mt-1 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong"
            >
              {status === "idle" ? "Start scanning" : "Try again"}
            </button>
          </div>
        )}

        {status === "scanning" && (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-[18%] rounded-2xl border-2 border-white/70"
            />
            <button
              type="button"
              onClick={stop}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-xl bg-black/60 px-4 py-2 text-sm font-semibold text-white backdrop-blur"
            >
              Stop
            </button>
          </>
        )}
      </div>

      {/* Manual entry ---------------------------------------------------- */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (manual.trim()) void handlePayload(manual.trim());
        }}
        className="flex gap-2"
      >
        <input
          value={manual}
          onChange={(event) => setManual(event.target.value)}
          placeholder="Or paste a card link / ID"
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand"
        />
        <button
          type="submit"
          className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold hover:border-brand/40"
        >
          Look up
        </button>
      </form>

      {/* Result ---------------------------------------------------------- */}
      {lookup && !lookup.ok && (
        <p className="flex items-start gap-2 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
          {lookup.message}
        </p>
      )}

      {lookup?.ok && (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div
            className="px-4 py-3"
            style={{
              backgroundColor: ROLE_COLORS[lookup.role].bg,
              color: ROLE_COLORS[lookup.role].fg,
            }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] opacity-80">
              {ROLE_LABELS[lookup.role]}
            </p>
            <p className="text-lg font-bold leading-tight">{lookup.fullName}</p>
          </div>

          <div className="p-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted">Team</dt>
                <dd className="font-medium">{lookup.teamName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted">Room</dt>
                <dd className="font-medium">{lookup.room ?? "Not allocated"}</dd>
              </div>
            </dl>

            {!lookup.isActive && (
              <p className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
                Deactivated account — send them to the desk supervisor.
              </p>
            )}

            {checkInMessage ? (
              <p className="mt-4 flex items-center gap-2 rounded-xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
                <BadgeCheck size={16} aria-hidden />
                {checkInMessage}
              </p>
            ) : lookup.checkedInAt ? (
              <p className="mt-4 flex items-center gap-2 rounded-xl bg-surface-muted px-4 py-3 text-sm text-muted">
                <BadgeCheck size={16} aria-hidden />
                Already checked in
              </p>
            ) : (
              <button
                type="button"
                disabled={checkingIn || !lookup.isActive}
                onClick={() => void confirmCheckIn(lookup.token)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-60"
              >
                {checkingIn && (
                  <Loader2 size={16} className="animate-spin" aria-hidden />
                )}
                Check in
              </button>
            )}

            <button
              type="button"
              onClick={() => void start()}
              className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm font-semibold hover:border-brand/40"
            >
              Scan next card
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
