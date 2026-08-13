"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  BadgeCheck,
  CameraOff,
  Loader2,
  LogIn,
  LogOut,
  ScanLine,
  TriangleAlert,
} from "lucide-react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import {
  DIRECTION_LABELS,
  isMeal,
  isScanDirection,
  isStation,
  MEAL_LABELS,
  MEALS,
  ROLE_COLORS,
  ROLE_LABELS,
  SCAN_DIRECTIONS,
  STATION_LABELS,
  STATIONS,
  type Meal,
  type ScanDirection,
  type Station,
} from "@/lib/types";
import { recordScan, type ScanRecord } from "./actions";

type Status = "idle" | "starting" | "scanning" | "denied" | "unsupported";

const STATION_KEY = "cf-scan-station";
const DIRECTION_KEY = "cf-scan-direction";
const MEAL_KEY = "cf-scan-meal";

/** Ignore the SAME card re-decoded inside this window. Frame noise, not policy. */
const REPEAT_WINDOW_MS = 3000;

/*
 * The operator's saved posting is an external store, so it is read through
 * useSyncExternalStore rather than copied into state from an effect. The
 * server snapshot is null, so SSR and the first client paint both use the
 * value the page passed in, and the saved one takes over after hydration.
 */
function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function readStored(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    // Private mode or blocked storage — the passed-in default is fine.
    return null;
  }
}

function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Nothing to do: the picker still works for this session.
  }
}

function ordinal(n: number) {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

function timeOfDay(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kathmandu",
  }).format(new Date(iso));
}

export function Scanner({
  initialStation,
  initialDirection,
  initialMeal,
}: {
  initialStation: Station;
  initialDirection: ScanDirection;
  initialMeal: Meal;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const busyRef = useRef(false);
  const lastTokenRef = useRef<string | null>(null);
  const lastAtRef = useRef(0);

  const [status, setStatus] = useState<Status>("idle");
  const [scan, setScan] = useState<ScanRecord | null>(null);
  const [manual, setManual] = useState("");

  // An explicit tap wins over the saved posting for the rest of the session.
  const [stationChoice, setStationChoice] = useState<Station | null>(null);
  const [directionChoice, setDirectionChoice] = useState<ScanDirection | null>(null);
  const [mealChoice, setMealChoice] = useState<Meal | null>(null);

  const storedStation = useSyncExternalStore(
    subscribeStorage,
    () => readStored(STATION_KEY),
    () => null,
  );
  const storedDirection = useSyncExternalStore(
    subscribeStorage,
    () => readStored(DIRECTION_KEY),
    () => null,
  );
  const storedMeal = useSyncExternalStore(
    subscribeStorage,
    () => readStored(MEAL_KEY),
    () => null,
  );

  const station: Station =
    stationChoice ?? (isStation(storedStation) ? storedStation : initialStation);
  const direction: ScanDirection =
    directionChoice ??
    (isScanDirection(storedDirection) ? storedDirection : initialDirection);

  /*
   * Defaults to whichever sitting the clock says, so a volunteer opening the
   * scanner at breakfast does not have to pick breakfast first. An explicit
   * tap still wins and is remembered.
   */
  const meal: Meal =
    mealChoice ?? (isMeal(storedMeal) ? storedMeal : initialMeal);

  // The live values the camera callback reads. State would be captured stale
  // inside the decode closure, and a mid-flight toggle must not be lost.
  const stationRef = useRef(station);
  const directionRef = useRef(direction);
  const mealRef = useRef(meal);
  useEffect(() => {
    stationRef.current = station;
  }, [station]);
  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);
  useEffect(() => {
    mealRef.current = meal;
  }, [meal]);

  // A volunteer manning the canteen all day sets this once; it survives a
  // reload or a PWA relaunch.
  function pickStation(next: Station) {
    setStationChoice(next);
    writeStored(STATION_KEY, next);
  }

  function pickDirection(next: ScanDirection) {
    setDirectionChoice(next);
    writeStored(DIRECTION_KEY, next);
  }

  function pickMeal(next: Meal) {
    setMealChoice(next);
    writeStored(MEAL_KEY, next);
  }

  const stop = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setStatus("idle");
  }, []);

  const handlePayload = useCallback(
    async (payload: string) => {
      // One request at a time — the camera fires many frames per second.
      if (busyRef.current) return;

      // Frame-noise dedupe: the same card decoded twice inside three seconds is
      // the camera, not the operator. A different card, or the same card later,
      // always logs a new row.
      const now = Date.now();
      if (
        lastTokenRef.current &&
        payload.includes(lastTokenRef.current) &&
        now - lastAtRef.current < REPEAT_WINDOW_MS
      ) {
        return;
      }

      busyRef.current = true;
      const result = await recordScan(
        payload,
        stationRef.current,
        directionRef.current,
        // Discarded server-side unless the station is the canteen.
        mealRef.current,
      );
      setScan(result);

      if (result.ok) {
        lastTokenRef.current = result.token;
        lastAtRef.current = Date.now();
        // Pause so the operator can read the card out.
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
    setScan(null);

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

  const posting =
    station === "canteen"
      ? `${STATION_LABELS[station]} · ${MEAL_LABELS[meal]}`
      : `${STATION_LABELS[station]} · ${DIRECTION_LABELS[direction]}`;

  return (
    <div className="grid gap-4">
      {/* Posting --------------------------------------------------------- */}
      <div className="grid gap-3 rounded-2xl border border-border bg-surface p-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
            Station
          </p>
          <div role="radiogroup" aria-label="Station" className="mt-2 flex gap-2">
            {STATIONS.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={station === value}
                onClick={() => pickStation(value)}
                className={`flex-1 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                  station === value
                    ? "bg-brand text-white"
                    : "border border-border bg-surface text-muted hover:border-brand/40"
                }`}
              >
                {STATION_LABELS[value]}
              </button>
            ))}
          </div>
        </div>

        {/* Only the canteen serves a sitting, and showing this at the exit
            gate would invite a volunteer to set something with no effect. */}
        {station === "canteen" && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Sitting
            </p>
            <div role="radiogroup" aria-label="Meal" className="mt-2 grid grid-cols-4 gap-2">
              {MEALS.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={meal === value}
                  onClick={() => pickMeal(value)}
                  className={`rounded-xl px-2 py-3 text-xs font-semibold transition-colors ${
                    meal === value
                      ? "bg-brand text-white"
                      : "border border-border bg-surface text-muted hover:border-brand/40"
                  }`}
                >
                  {MEAL_LABELS[value]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
            Direction
          </p>
          <div role="radiogroup" aria-label="Direction" className="mt-2 flex gap-2">
            {SCAN_DIRECTIONS.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={direction === value}
                onClick={() => pickDirection(value)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                  direction === value
                    ? "bg-brand text-white"
                    : "border border-border bg-surface text-muted hover:border-brand/40"
                }`}
              >
                {value === "in" ? (
                  <LogIn size={15} aria-hidden />
                ) : (
                  <LogOut size={15} aria-hidden />
                )}
                {DIRECTION_LABELS[value]}
              </button>
            ))}
          </div>
        </div>

        {/* The glance target. Typography carries the distinction rather than a
            colour pair, because no token in this palette reads reliably in both
            themes against white. */}
        <p className="text-center text-lg font-bold uppercase tracking-[0.2em] text-brand">
          {posting}
        </p>
      </div>

      {/* Camera ---------------------------------------------------------- */}
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-black">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          muted
          playsInline
        />

        {status === "scanning" && (
          <span className="absolute left-2 top-2 rounded-lg bg-black/70 px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-white backdrop-blur">
            {posting}
          </span>
        )}

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
          const value = manual.trim();
          if (!value) return;
          // Manual entry is an explicit act — bypass the repeat guard.
          lastTokenRef.current = null;
          void handlePayload(value);
          setManual("");
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
          Record
        </button>
      </form>

      {/* Result ---------------------------------------------------------- */}
      {scan && !scan.ok && (
        <p className="flex items-start gap-2 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
          {scan.message}
        </p>
      )}

      {scan?.ok && (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div
            className="px-4 py-3"
            style={{
              backgroundColor: ROLE_COLORS[scan.role].bg,
              color: ROLE_COLORS[scan.role].fg,
            }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] opacity-80">
              {ROLE_LABELS[scan.role]}
            </p>
            <p className="text-lg font-bold leading-tight">{scan.fullName}</p>
          </div>

          <div className="p-4">
            {/* Echoed by the database, so a toggle flipped mid-flight cannot
                make this card lie about what was recorded. */}
            <p className="flex items-center gap-2 rounded-xl bg-success/10 px-4 py-3 text-sm font-semibold text-success">
              <BadgeCheck size={16} aria-hidden />
              Recorded · {scan.station}
              {scan.meal ? ` · ${scan.meal}` : ` · ${scan.direction}`} ·{" "}
              {timeOfDay(scan.scannedAt)}
            </p>

            {scan.firstTime && (
              <p className="mt-2 rounded-xl bg-brand-soft px-4 py-2.5 text-sm font-semibold text-brand">
                First check-in of the event
              </p>
            )}

            {/* Flagged, never refused. The row is already written — this tells
                the volunteer what they are looking at and lets them decide,
                which is the same rule the deactivated-card notice follows. */}
            {scan.meal && scan.mealRepeat > 0 && (
              <p className="mt-2 flex items-start gap-2 rounded-xl bg-warning/10 px-4 py-2.5 text-sm font-semibold text-warning">
                <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
                <span>
                  Already had {scan.meal} today
                  {scan.mealRepeat > 1 ? ` (${scan.mealRepeat} times)` : ""}. Second
                  helping — your call.
                </span>
              </p>
            )}

            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted">Team</dt>
                <dd className="font-medium">{scan.teamName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted">Room</dt>
                <dd className="font-medium">{scan.room ?? "Not allocated"}</dd>
              </div>
            </dl>

            <p className="mt-3 text-xs text-muted">
              {ordinal(scan.scanCount)} scan at {scan.station} today
              {scan.previousDirection
                ? ` · previously ${scan.previousDirection.toUpperCase()}`
                : ""}
            </p>

            {!scan.isActive && (
              <p className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
                Deactivated account — send them to the desk supervisor. The scan was
                still logged.
              </p>
            )}

            <button
              type="button"
              onClick={() => void start()}
              className="mt-4 w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-strong"
            >
              Scan next card
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
