/**
 * The 36-hour clock's shape, shared by the server pages that render the first
 * paint and the client hook that keeps it live.
 *
 * Deliberately free of any Supabase import so a Server Component can call
 * hackathonFromRow() directly — the browser-only read lives in use-hackathon.ts.
 */

export const HACK_DEFAULT_SECONDS = 36 * 3600;

export type HackathonStatus = "idle" | "running" | "finished";

export type HackathonState = {
  status: HackathonStatus;
  startedAt: string | null;
  endsAt: string | null;
  durationSeconds: number;
  coordinatorName: string | null;
  coordinatorTitle: string | null;
  startedByName: string | null;
  /**
   * Server clock minus device clock, measured on each read. Zero on the
   * server-rendered first paint — the device's own clock is a good enough
   * starting point, and the first client read (pulse, heartbeat, or coming
   * back to the tab) corrects it within seconds.
   */
  skewMs: number;
};

/** One row of hackathon_state() → the shape the components render. */
export function hackathonFromRow(
  row: Record<string, unknown> | null | undefined,
  skewMs: number,
): HackathonState {
  return {
    status: (row?.status as HackathonStatus) ?? "idle",
    startedAt: (row?.started_at as string | null) ?? null,
    endsAt: (row?.ends_at as string | null) ?? null,
    durationSeconds: (row?.duration_seconds as number | null) ?? HACK_DEFAULT_SECONDS,
    coordinatorName: (row?.coordinator_name as string | null) ?? null,
    coordinatorTitle: (row?.coordinator_title as string | null) ?? null,
    startedByName: (row?.started_by_name as string | null) ?? null,
    skewMs,
  };
}
