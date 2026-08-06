import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Quiz } from "@/lib/types";
import { QuizRunner } from "./quiz-runner";

export const metadata: Metadata = { title: "Quiz" };

export default async function QuizPage(props: PageProps<"/quiz/[id]">) {
  const { id } = await props.params;
  const { profile } = await requireMember();

  const supabase = await createClient();
  const { data } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const quiz = data as Quiz | null;
  if (!quiz || !quiz.is_published) notFound();

  const { data: attempt } = await supabase
    .from("quiz_attempts")
    .select("score, total_points, submitted_at")
    .eq("quiz_id", id)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (attempt?.submitted_at) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-12 text-center">
        <h1 className="text-xl font-bold">{quiz.title}</h1>
        <p className="mt-3 text-sm text-muted">You&rsquo;ve already played this one.</p>
        <p className="mt-4 text-3xl font-extrabold text-brand">
          {attempt.score}/{attempt.total_points}
        </p>
        <div className="mt-6 grid gap-2">
          <Link
            href="/leaderboard"
            className="rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-strong"
          >
            View leaderboard
          </Link>
          <Link
            href="/quiz"
            className="rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold hover:border-brand/40"
          >
            Back to quizzes
          </Link>
        </div>
      </div>
    );
  }

  return <QuizRunner quizId={quiz.id} title={quiz.title} />;
}
