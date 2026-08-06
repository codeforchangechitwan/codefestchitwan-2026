"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, Timer } from "lucide-react";
import {
  startAttempt,
  submitAttempt,
  type PlayableQuestion,
  type SubmitResult,
} from "../actions";

type Phase = "loading" | "error" | "playing" | "submitting" | "done";

export function QuizRunner({ quizId, title }: { quizId: string; title: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [questions, setQuestions] = useState<PlayableQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);

  // Guards against the timer and the button both submitting.
  const submittedRef = useRef(false);

  // The timer submits whatever has been answered so far, but must not restart
  // every keystroke — so the latest answers are mirrored into a ref from an
  // effect rather than read during render.
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const send = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setPhase("submitting");
    const outcome = await submitAttempt(quizId, answersRef.current);
    setResult(outcome);
    setPhase("done");
  }, [quizId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const outcome = await startAttempt(quizId);
      if (cancelled) return;
      if (!outcome.ok) {
        setMessage(outcome.message);
        setPhase("error");
        return;
      }
      setQuestions(outcome.questions);
      setEndsAt(new Date(outcome.endsAt).getTime());
      setPhase("playing");
    })();
    return () => {
      cancelled = true;
    };
  }, [quizId]);

  useEffect(() => {
    if (phase !== "playing" || endsAt === null) return;

    const tick = () => {
      const left = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) void send();
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, endsAt, send]);

  if (phase === "loading") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20">
        <Loader2 size={24} className="animate-spin text-brand" aria-hidden />
        <p className="mt-3 text-sm text-muted">Loading quiz…</p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-16 text-center">
        <AlertTriangle size={28} className="mx-auto text-warning" aria-hidden />
        <h1 className="mt-3 text-lg font-bold">Can&rsquo;t start this quiz</h1>
        <p className="mt-2 text-sm text-muted">{message}</p>
        <Link
          href="/quiz"
          className="mt-6 inline-flex rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-strong"
        >
          Back to quizzes
        </Link>
      </div>
    );
  }

  if (phase === "done") {
    const success = result?.ok === true;
    return (
      <div className="mx-auto w-full max-w-md px-4 py-16 text-center">
        <h1 className="text-lg font-bold">{title}</h1>
        {success ? (
          <>
            <p className="mt-6 text-4xl font-extrabold text-brand">
              {result.score}/{result.total}
            </p>
            <p className="mt-2 text-sm text-muted">
              {result.correct} of {result.asked} correct
            </p>
          </>
        ) : (
          <p className="mt-6 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
            {result && !result.ok ? result.message : "Something went wrong."}
          </p>
        )}
        <div className="mt-8 grid gap-2">
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

  const question = questions[index];
  const answered = Object.keys(answers).length;
  const isLast = index === questions.length - 1;
  const lowTime = remaining !== null && remaining <= 30;

  return (
    <div className="mx-auto w-full max-w-md px-4 py-6">
      {/* Timer + progress ------------------------------------------------ */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">
          Question {index + 1} of {questions.length}
        </p>
        <p
          role="timer"
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-sm font-bold tabular-nums ${
            lowTime ? "bg-danger/10 text-danger" : "bg-brand-soft text-brand"
          }`}
        >
          <Timer size={14} aria-hidden />
          {remaining === null
            ? "--:--"
            : `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(
                remaining % 60,
              ).padStart(2, "0")}`}
        </p>
      </div>

      <div
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuenow={answered}
        aria-valuemin={0}
        aria-valuemax={questions.length}
        aria-label="Questions answered"
      >
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${(answered / questions.length) * 100}%` }}
        />
      </div>

      {/* Question -------------------------------------------------------- */}
      <fieldset className="mt-6">
        <legend className="text-lg font-semibold leading-snug">
          {question.prompt}
        </legend>

        <div className="mt-4 grid gap-2">
          {question.options.map((option, optionIndex) => {
            const selected = answers[question.id] === optionIndex;
            return (
              <label
                key={optionIndex}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm transition-colors ${
                  selected
                    ? "border-brand bg-brand-soft font-medium"
                    : "border-border bg-surface hover:border-brand/40"
                }`}
              >
                <input
                  type="radio"
                  name={question.id}
                  checked={selected}
                  onChange={() =>
                    setAnswers((prev) => ({ ...prev, [question.id]: optionIndex }))
                  }
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                    selected
                      ? "border-brand bg-brand text-white"
                      : "border-border text-muted"
                  }`}
                >
                  {String.fromCharCode(65 + optionIndex)}
                </span>
                {option}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Navigation ------------------------------------------------------ */}
      <div className="mt-6 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold disabled:opacity-40"
        >
          <ChevronLeft size={16} aria-hidden />
          Back
        </button>

        {isLast ? (
          <button
            type="button"
            onClick={() => void send()}
            disabled={phase !== "playing"}
            className="ml-auto inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-60"
          >
            {(phase as Phase) === "submitting" && (
              <Loader2 size={16} className="animate-spin" aria-hidden />
            )}
            Submit
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
            className="ml-auto inline-flex items-center gap-1 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-strong"
          >
            Next
            <ChevronRight size={16} aria-hidden />
          </button>
        )}
      </div>

      {answered < questions.length && isLast && (
        <p className="mt-3 text-center text-xs text-muted">
          {questions.length - answered} unanswered — they&rsquo;ll score zero.
        </p>
      )}
    </div>
  );
}
