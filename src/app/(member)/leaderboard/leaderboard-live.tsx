"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLiveQuery } from "@/lib/use-live-query";

export type LeaderboardRow = {
  rank: number;
  user_id: string;
  full_name: string;
  team_name: string | null;
  score: number;
  total_points: number;
  duration_ms: number | null;
};

const MEDALS = ["🥇", "🥈", "🥉"];

/**
 * The leaderboard, live as attempts are graded.
 *
 * quiz_leaderboard() already exists and is already granted to authenticated,
 * so the browser calls exactly the same function the server page called — same
 * ranking, same tie-break, no second implementation to drift.
 */
export function LeaderboardLive({
  quizId,
  quizTitle,
  meId,
  initial,
}: {
  quizId: string;
  quizTitle: string;
  meId: string;
  initial: LeaderboardRow[];
}) {
  const { data: rows } = useLiveQuery({
    topics: ["leaderboard"],
    initial,
    fetcher: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("quiz_leaderboard", {
        target_quiz: quizId,
        max_rows: 50,
      });
      if (error) throw error;
      return (data ?? []) as LeaderboardRow[];
    },
  });

  if (rows.length === 0) {
    return (
      <p className="mt-6 rounded-2xl border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
        Nobody has finished <strong>{quizTitle}</strong> yet. Be the first —{" "}
        <Link href="/quiz" className="font-medium text-brand underline">
          play now
        </Link>
        .
      </p>
    );
  }

  return (
    <ol className="mt-6 grid gap-2">
      {rows.map((row) => {
        const isMe = row.user_id === meId;
        return (
          <li
            key={row.user_id}
            className={`flex items-center gap-3 rounded-xl border p-3 ${
              isMe ? "border-brand bg-brand-soft" : "border-border bg-surface"
            }`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                row.rank <= 3 ? "text-lg" : "bg-surface-muted text-muted"
              }`}
              aria-label={`Rank ${row.rank}`}
            >
              {MEDALS[row.rank - 1] ?? row.rank}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold leading-tight">
                {row.full_name}
                {isMe && (
                  <span className="ml-1.5 text-xs font-medium text-brand">
                    (you)
                  </span>
                )}
              </span>
              {row.team_name && (
                <span className="block truncate text-xs text-muted">
                  {row.team_name}
                </span>
              )}
            </span>

            <span className="shrink-0 text-right">
              <span className="block font-mono font-bold tabular-nums text-brand">
                {row.score}/{row.total_points}
              </span>
              {row.duration_ms !== null && (
                <span className="block text-[11px] text-muted">
                  {Math.round(row.duration_ms / 1000)}s
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
