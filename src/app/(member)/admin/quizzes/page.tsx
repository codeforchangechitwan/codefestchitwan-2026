import type { Metadata } from "next";
import { Gamepad2 } from "lucide-react";
import { requireExecutive } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Quiz } from "@/lib/types";
import { PublishToggle } from "./publish-toggle";

export const metadata: Metadata = { title: "Quizzes" };

export default async function AdminQuizzesPage() {
  await requireExecutive();

  const supabase = await createClient();
  const { data: quizRows } = await supabase
    .from("quizzes")
    .select("*")
    .order("created_at", { ascending: true });

  const quizzes = (quizRows ?? []) as Quiz[];

  const { data: counts } = await supabase
    .from("quiz_attempts")
    .select("quiz_id, submitted_at");

  const played = new Map<string, number>();
  for (const row of counts ?? []) {
    if (row.submitted_at) {
      played.set(row.quiz_id, (played.get(row.quiz_id) ?? 0) + 1);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <Gamepad2 size={22} className="text-brand" aria-hidden />
        Quizzes
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Publish a quiz to make it visible to members. Questions and answer keys are
        managed in the database — see{" "}
        <code className="font-mono text-xs">supabase/migrations</code> for the seed
        format.
      </p>

      {quizzes.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
          No quizzes yet. Run the seed migration to add the warm-up quiz.
        </p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {quizzes.map((quiz) => (
            <li
              key={quiz.id}
              className="rounded-2xl border border-border bg-surface p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold leading-snug">{quiz.title}</h2>
                  {quiz.description && (
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {quiz.description}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand">
                  {played.get(quiz.id) ?? 0} played
                </span>
              </div>

              <p className="mt-3 text-xs text-muted">
                {Math.round(quiz.time_limit_seconds / 60)} minute limit
              </p>

              <div className="mt-4">
                <PublishToggle quizId={quiz.id} published={quiz.is_published} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
