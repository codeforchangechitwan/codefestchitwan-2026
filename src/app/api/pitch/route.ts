import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Live pitch state, polled every ~2s by the projector and by every phone in
 * the hall.
 *
 * One Supabase round trip on purpose — no getSessionProfile(), which is an
 * auth.getUser() plus a profiles select on every poll, doubled across two
 * hundred devices. pitch_state() carries its own `auth.uid() is not null`
 * guard, so a signed-out caller simply gets zero rows.
 *
 * Answers with a status code rather than a redirect, so this route must NOT be
 * added to PROTECTED_PREFIXES: a poller receiving an HTML login page would
 * parse it as JSON and fail confusingly. It is also excluded from the proxy
 * matcher so a poll does not run auth.getUser() in the proxy on every tick.
 */
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("pitch_state");
  const row = Array.isArray(data) ? data[0] : null;

  if (error || !row) {
    return new NextResponse("Sign in first.", { status: 401 });
  }

  return NextResponse.json(
    {
      status: row.status,
      teamId: row.team_id,
      teamCode: row.team_code,
      teamName: row.team_name,
      pitchOrder: row.pitch_order,
      label: row.label,
      durationSeconds: row.duration_seconds,
      endsAt: row.ends_at,
      remainingSeconds: row.remaining_seconds,
      nextTeamCode: row.next_team_code,
      nextTeamName: row.next_team_name,
      updatedAt: row.updated_at,
      serverNow: row.server_now,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
