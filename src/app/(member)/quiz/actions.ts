"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireMember } from "@/lib/auth";
import type { Quiz } from "@/lib/types";

/** A question as the browser is allowed to see it — no answer key. */
export type PlayableQuestion = {
  id: string;
  prompt: string;
  options: string[];
  points: number;
};

export type StartResult =
  | { ok: true; attemptId: string; questions: PlayableQuestion[]; endsAt: string }
  | { ok: false; message: string };

export async function startAttempt(quizId: string): Promise<StartResult> {
  const { profile } = await requireMember();
  const supabase = await createClient();

  const { data: quizRow } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .single();

  const quiz = quizRow as Quiz | null;
  if (!quiz || !quiz.is_published) {
    return { ok: false, message: "That quiz isn't available." };
  }

  const now = Date.now();
  if (quiz.opens_at && now < new Date(quiz.opens_at).getTime()) {
    return { ok: false, message: "This quiz hasn't opened yet." };
  }
  if (quiz.closes_at && now > new Date(quiz.closes_at).getTime()) {
    return { ok: false, message: "This quiz has closed." };
  }

  const { data: existing } = await supabase
    .from("quiz_attempts")
    .select("id, submitted_at, started_at")
    .eq("quiz_id", quizId)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (existing?.submitted_at) {
    return { ok: false, message: "You've already completed this quiz." };
  }

  let attemptId: string;
  let startedAt: string;

  if (existing) {
    attemptId = existing.id as string;
    startedAt = existing.started_at as string;
  } else {
    const { data: created, error } = await supabase
      .from("quiz_attempts")
      .insert({ quiz_id: quizId, user_id: profile.id })
      .select("id, started_at")
      .single();

    if (error || !created) {
      return { ok: false, message: "Couldn't start the quiz. Please try again." };
    }
    attemptId = created.id as string;
    startedAt = created.started_at as string;
  }

  const { data: questionRows } = await supabase
    .from("quiz_questions")
    .select("id, prompt, options, points")
    .eq("quiz_id", quizId)
    .order("sort_order", { ascending: true });

  const questions: PlayableQuestion[] = (questionRows ?? []).map((row) => ({
    id: row.id as string,
    prompt: row.prompt as string,
    options: (row.options ?? []) as string[],
    points: (row.points ?? 1) as number,
  }));

  if (questions.length === 0) {
    return { ok: false, message: "This quiz has no questions yet." };
  }

  const endsAt = new Date(
    new Date(startedAt).getTime() + quiz.time_limit_seconds * 1000,
  ).toISOString();

  return { ok: true, attemptId, questions, endsAt };
}

export type SubmitResult =
  | { ok: true; score: number; total: number; correct: number; asked: number }
  | { ok: false; message: string };

/**
 * Grades an attempt server-side.
 *
 * The answer key is read with the service role because `quiz_answer_keys` has
 * no client-facing policies — a participant cannot fetch it even with a valid
 * session token.
 */
export async function submitAttempt(
  quizId: string,
  selections: Record<string, number>,
): Promise<SubmitResult> {
  const { profile } = await requireMember();
  const supabase = await createClient();

  const { data: attempt } = await supabase
    .from("quiz_attempts")
    .select("id, started_at, submitted_at")
    .eq("quiz_id", quizId)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (!attempt) return { ok: false, message: "Start the quiz before submitting." };
  if (attempt.submitted_at) {
    return { ok: false, message: "This attempt was already submitted." };
  }

  const admin = createAdminClient();

  const { data: quiz } = await admin
    .from("quizzes")
    .select("time_limit_seconds")
    .eq("id", quizId)
    .single();

  const startedMs = new Date(attempt.started_at as string).getTime();
  const durationMs = Date.now() - startedMs;
  const limitMs = ((quiz?.time_limit_seconds as number) ?? 600) * 1000;
  // Small grace window so a slow network doesn't void an honest submission.
  const withinTime = durationMs <= limitMs + 5000;

  const { data: questions } = await admin
    .from("quiz_questions")
    .select("id, points, quiz_answer_keys(correct_index)")
    .eq("quiz_id", quizId);

  type Row = {
    id: string;
    points: number;
    quiz_answer_keys: { correct_index: number } | { correct_index: number }[] | null;
  };

  let score = 0;
  let total = 0;
  let correct = 0;

  const answerRows = (questions ?? []).map((raw) => {
    const row = raw as unknown as Row;
    const key = Array.isArray(row.quiz_answer_keys)
      ? row.quiz_answer_keys[0]
      : row.quiz_answer_keys;

    const selected = selections[row.id];
    const hasAnswer = typeof selected === "number";
    const isCorrect =
      withinTime && hasAnswer && key ? selected === key.correct_index : false;

    total += row.points;
    if (isCorrect) {
      score += row.points;
      correct += 1;
    }

    return {
      attempt_id: attempt.id as string,
      question_id: row.id,
      selected_index: hasAnswer ? selected : null,
      is_correct: isCorrect,
    };
  });

  if (answerRows.length > 0) {
    await admin
      .from("quiz_answers")
      .upsert(answerRows, { onConflict: "attempt_id,question_id" });
  }

  await admin
    .from("quiz_attempts")
    .update({
      score,
      total_points: total,
      duration_ms: Math.round(durationMs),
      submitted_at: new Date().toISOString(),
    })
    .eq("id", attempt.id as string);

  revalidatePath("/quiz");
  revalidatePath("/leaderboard");

  if (!withinTime) {
    return {
      ok: false,
      message: "Time ran out before your answers reached us — scored as zero.",
    };
  }

  return { ok: true, score, total, correct, asked: answerRows.length };
}
