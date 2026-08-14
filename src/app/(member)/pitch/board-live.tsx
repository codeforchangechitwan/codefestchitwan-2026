"use client";

import { createClient } from "@/lib/supabase/client";
import { useLiveQuery } from "@/lib/use-live-query";

export type BoardRow = {
  team_id: string;
  team_code: string;
  team_name: string;
  room: string | null;
  table_number: string | null;
  pitch_order: number | null;
  is_mine: boolean;
};

function ordinal(n: number) {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

/**
 * The running order, live as it is drawn.
 *
 * A team watching the draw on their phone sees their slot land at the same
 * moment the hall hears it called, which is the whole point of drawing it in
 * front of everyone. The pulse fires once per draw statement, and the re-read
 * goes to Supabase — the VPS is not involved in a ceremony at all.
 */
export function BoardLive({ initial }: { initial: BoardRow[] }) {
  const { data: board } = useLiveQuery({
    topics: ["draw"],
    initial,
    fetcher: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("pitch_board");
      if (error) throw error;
      return (data ?? []) as BoardRow[];
    },
  });

  const drawn = board.filter((row) => row.pitch_order !== null);
  const mine = board.find((row) => row.is_mine) ?? null;

  return (
    <>
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
          The running order hasn&rsquo;t been drawn yet. It appears here the
          moment it is.
        </p>
      ) : (
        <ol className="mt-3 grid gap-2">
          {drawn.map((row) => (
            <li
              key={row.team_id}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                row.is_mine
                  ? "border-brand bg-brand-soft"
                  : "border-border bg-surface"
              }`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft font-mono text-sm font-bold text-brand">
                {row.pitch_order}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold leading-tight">
                  {row.team_name}
                  {row.is_mine && (
                    <span className="ml-1.5 text-xs font-medium text-muted">
                      (you)
                    </span>
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
    </>
  );
}
