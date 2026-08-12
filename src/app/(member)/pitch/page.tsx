import type { Metadata } from "next";
import { Presentation } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PitchLive } from "./pitch-live";

export const metadata: Metadata = { title: "Pitching" };

type BoardRow = {
  team_id: string;
  team_code: string;
  team_name: string;
  room: string | null;
  table_number: string | null;
  pitch_order: number | null;
  is_mine: boolean;
};

export default async function PitchPage() {
  const { profile } = await requireMember();

  const supabase = await createClient();
  const { data } = await supabase.rpc("pitch_board");
  const board = (data ?? []) as BoardRow[];

  const drawn = board.filter((row) => row.pitch_order !== null);
  const mine = board.find((row) => row.is_mine) ?? null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <Presentation size={22} className="text-brand" aria-hidden />
        Pitching
      </h1>

      <div className="mt-4">
        <PitchLive myTeamId={profile.team_id} />
      </div>

      {mine?.pitch_order && (
        <p className="mt-3 rounded-xl bg-brand-soft px-4 py-3 text-center text-sm font-semibold text-brand">
          {mine.team_name} pitches {ordinal(mine.pitch_order)}
          {mine.table_number ? ` · table ${mine.table_number}` : ""}
        </p>
      )}

      <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-muted">
        Running order
      </h2>

      {drawn.length === 0 ? (
        <p className="mt-3 rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          The running order hasn&rsquo;t been drawn yet. It appears here the moment
          it is.
        </p>
      ) : (
        <ol className="mt-3 grid gap-2">
          {drawn.map((row) => (
            <li
              key={row.team_id}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                row.is_mine ? "border-brand bg-brand-soft" : "border-border bg-surface"
              }`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft font-mono text-sm font-bold text-brand">
                {row.pitch_order}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold leading-tight">
                  {row.team_name}
                  {row.is_mine && (
                    <span className="ml-1.5 text-xs font-medium text-muted">(you)</span>
                  )}
                </span>
                <span className="block font-mono text-xs text-muted">
                  {row.team_code}
                  {row.table_number ? ` · table ${row.table_number}` : ""}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ordinal(n: number) {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}
