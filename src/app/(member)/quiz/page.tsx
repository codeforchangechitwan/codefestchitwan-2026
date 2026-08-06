import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, Gamepad2, Lock, Trophy } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Quiz } from "@/lib/types";

export const metadata: Metadata = { title: "Quiz & games" };

type AttemptSummary = {
  quiz_id: string;
  score: number;
  total_points: number;
  submitted_at: string | null;
};

export default async function QuizIndexPage() {
  const { profile } = await requireMember();
  const supabase = await createClient();

  const { data: quizRows } = await supabase
    .from("quizzes")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: true });

  const { data: attemptRows } = await supabase
    .from("quiz_attempts")
    .select("quiz_id, score, total_points, submitted_at")
    .eq("user_id", profile.id);

  const quizzes = (quizRows ?? []) as Quiz[];
  const attempts = new Map(
    ((attemptRows ?? []) as AttemptSummary[]).map((a) => [a.quiz_id, a]),
  );

  // This page is force-dynamic, so reading the clock per request is intended.
  const now = new Date().getTime();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <Gamepad2 size={22} className="text-brand" aria-hidden />
        Quiz &amp; games
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Timed quizzes you can play from your phone. Scores go straight to the
        leaderboard — the main quiz slot is Saturday, 7:00–7:40 PM.
      </p>

      <Link
        href="/leaderboard"
        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold hover:border-brand/40"
      >
        <Trophy size={15} className="text-brand" aria-hidden />
        View leaderboard
      </Link>

      {quizzes.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
          No quizzes are open yet. They&rsquo;ll appear here when the organisers
          publish them.
        </p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {quizzes.map((quiz) => {
            const attempt = attempts.get(quiz.id);
            const done = Boolean(attempt?.submitted_at);
            const notOpen =
              quiz.opens_at !== null && now < new Date(quiz.opens_at).getTime();
            const closed =
              quiz.closes_at !== null && now > new Date(quiz.closes_at).getTime();
            const locked = notOpen || closed;

            return (
              <li
                key={quiz.id}
                className="rounded-2xl border border-border bg-surface p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold leading-snug">{quiz.title}</h2>
                  {done && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                      <CheckCircle2 size={12} aria-hidden />
                      Done
                    </span>
                  )}
                </div>

                {quiz.description && (
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {quiz.description}
                  </p>
                )}

                <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted">
                  <Clock size={13} aria-hidden />
                  {Math.round(quiz.time_limit_seconds / 60)} minute limit
                </p>

                <div className="mt-4">
                  {done ? (
                    <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm">
                      You scored{" "}
                      <strong className="text-brand">
                        {attempt!.score}/{attempt!.total_points}
                      </strong>
                      .{" "}
                      <Link
                        href="/leaderboard"
                        className="font-medium text-brand underline underline-offset-2"
                      >
                        See the leaderboard
                      </Link>
                    </p>
                  ) : locked ? (
                    <p className="inline-flex items-center gap-1.5 rounded-xl bg-surface-muted px-4 py-3 text-sm text-muted">
                      <Lock size={14} aria-hidden />
                      {notOpen ? "Opens later in the event" : "This quiz has closed"}
                    </p>
                  ) : (
                    <Link
                      href={`/quiz/${quiz.id}`}
                      className="inline-flex rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong"
                    >
                      {attempt ? "Resume quiz" : "Start quiz"}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
