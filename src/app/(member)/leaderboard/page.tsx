import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Quiz } from "@/lib/types";
import { LeaderboardLive, type LeaderboardRow } from "./leaderboard-live";

export const metadata: Metadata = { title: "Leaderboard" };

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

  let rows: LeaderboardRow[] = [];
  if (active) {
    const { data } = await supabase.rpc("quiz_leaderboard", {
      target_quiz: active.id,
      max_rows: 50,
    });
    rows = (data ?? []) as LeaderboardRow[];
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
      ) : (
        /* Server-rendered first paint, then live off the `leaderboard` pulse
           as attempts are graded. */
        <LeaderboardLive
          quizId={active.id}
          quizTitle={active.title}
          meId={profile.id}
          initial={rows}
        />
      )}

      <p className="mt-6 text-xs text-muted">
        Ties are broken by who finished fastest.
      </p>
    </div>
  );
}
