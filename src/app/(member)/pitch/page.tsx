import type { Metadata } from "next";
import { Presentation } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PitchLive } from "./pitch-live";
import { BoardLive, type BoardRow } from "./board-live";

export const metadata: Metadata = { title: "Pitching" };

export default async function PitchPage() {
  const { profile } = await requireMember();

  const supabase = await createClient();
  const { data } = await supabase.rpc("pitch_board");
  const board = (data ?? []) as BoardRow[];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <Presentation size={22} className="text-brand" aria-hidden />
        Pitching
      </h1>

      <div className="mt-4">
        <PitchLive myTeamId={profile.team_id} />
      </div>

      {/* Server-rendered first, then live off the `draw` pulse: a team sees its
          slot land at the moment it is called in the hall. */}
      <BoardLive initial={board} />
    </div>
  );
}
