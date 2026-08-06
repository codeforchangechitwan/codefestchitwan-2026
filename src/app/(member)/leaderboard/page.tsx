import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Quiz } from "@/lib/types";

export const metadata: Metadata = { title: "Leaderboard" };

type Row = {
  rank: number;
  user_id: string;
  full_name: string;
  team_name: string | null;
  score: number;
  total_points: number;
  duration_ms: number | null;
};

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function LeaderboardPage(props: PageProps<"/leaderboard">) {
  const { profile } = await requireMember();
  const params = await props.searchParams;
  const supabase = await createClient();

  const { data: quizRows } = await supabase
    .from("quizzes")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: true });

  const quizzes = (quizRows ?? []) as Quiz[];
  const requested = typeof params.quiz === "string" ? params.quiz : null;
  const active =
    quizzes.find((quiz) => quiz.id === requested) ?? quizzes[0] ?? null;

  let rows: Row[] = [];
  if (active) {
    const { data } = await supabase.rpc("quiz_leaderboard", {
      target_quiz: active.id,
      max_rows: 50,
    });
    rows = (data ?? []) as Row[];
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <Trophy size={22} className="text-brand" aria-hidden />
        Leaderboard
      </h1>

      {quizzes.length > 1 && (
        <div className="scroll-x mt-4 -mx-4 px-4">
          <div className="flex gap-2">
            {quizzes.map((quiz) => (
              <Link
                key={quiz.id}
                href={`/leaderboard?quiz=${quiz.id}`}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  active?.id === quiz.id
                    ? "bg-brand text-white"
                    : "border border-border bg-surface text-muted hover:text-foreground"
                }`}
              >
                {quiz.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      {!active ? (
        <p className="mt-6 rounded-2xl border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
          No quizzes published yet.
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
          Nobody has finished <strong>{active.title}</strong> yet. Be the first —{" "}
          <Link href="/quiz" className="font-medium text-brand underline">
            play now
          </Link>
          .
        </p>
      ) : (
        <ol className="mt-6 grid gap-2">
          {rows.map((row) => {
            const isMe = row.user_id === profile.id;
            return (
              <li
                key={row.user_id}
                className={`flex items-center gap-3 rounded-xl border p-3 ${
                  isMe
                    ? "border-brand bg-brand-soft"
                    : "border-border bg-surface"
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
      )}

      <p className="mt-6 text-xs text-muted">
        Ties are broken by who finished fastest.
      </p>
    </div>
  );
}
