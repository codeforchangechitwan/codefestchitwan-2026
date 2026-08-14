import type { Metadata } from "next";
import { Download, Gavel, FileText } from "lucide-react";
import {
  CRITERIA,
  RECOMMENDATIONS,
  TOTAL_MARKS,
  JUDGING_SHEET_PDF,
} from "@/lib/judging";

export const metadata: Metadata = {
  title: "Judging Criteria",
  description: `How Codefest 2026 Chitwan projects are scored: ${CRITERIA.length} criteria over ${TOTAL_MARKS} marks, from the official judging and evaluation sheet.`,
};

/**
 * The rubric, in public.
 *
 * A team that knows it is marked out of 10 on a working prototype and 4 on
 * teamwork builds a different weekend than one guessing. The panel scores on
 * paper from the same sheet, which is downloadable below — this page is the
 * readable version of that document, not a second opinion about it.
 */
export default function JudgingPage() {
  return (
    <div className="relative min-h-screen py-10 px-4 max-w-4xl mx-auto">
      <div className="ambient-glow top-0 left-10 w-[400px] h-[300px] opacity-20" />

      <h1 className="flex items-center gap-2.5 text-3xl font-extrabold tracking-tight">
        <Gavel size={26} className="text-brand shrink-0" aria-hidden />
        Judging Criteria
      </h1>
      <p className="mt-1 text-xs sm:text-sm text-muted">
        Provincial Phase · Official Judging &amp; Evaluation Sheet
      </p>

      {/* Summary + the printable sheet ------------------------------------ */}
      <div className="glass-card mt-6 p-6 border-glass flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-brand-soft border border-brand/30 flex items-center justify-center text-brand shrink-0">
            <FileText size={20} aria-hidden />
          </div>
          <div>
            <h2 className="font-bold text-base text-foreground">
              {CRITERIA.length} criteria, {TOTAL_MARKS} marks in total
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Every judge scores each team against the same sheet.
            </p>
          </div>
        </div>

        <a
          href={JUDGING_SHEET_PDF}
          target="_blank"
          rel="noreferrer"
          className="btn-primary-glass inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold shrink-0"
        >
          <Download size={14} aria-hidden />
          Printable sheet (PDF)
        </a>
      </div>

      {/* The criteria ----------------------------------------------------- */}
      <ol className="mt-6 grid gap-3">
        {CRITERIA.map((criterion) => (
          <li
            key={criterion.no}
            className="glass-card border-glass p-5 flex items-start gap-4"
          >
            <span
              className="mt-0.5 h-7 w-7 shrink-0 rounded-lg bg-surface-muted text-muted font-mono text-xs font-bold flex items-center justify-center"
              aria-hidden
            >
              {criterion.no}
            </span>

            <div className="min-w-0 flex-1">
              <h3 className="font-bold leading-snug text-foreground">
                {criterion.name}{" "}
                <span className="text-muted font-medium">
                  ({criterion.short})
                </span>
              </h3>
              <p className="mt-1 text-sm text-muted leading-relaxed">
                {criterion.description}
              </p>

              {/* Weight as a bar as well as a number: the shape of the marking
                  scheme is the thing worth seeing at a glance. */}
              <div
                className="mt-3 h-1.5 w-full rounded-full bg-surface-muted overflow-hidden"
                aria-hidden
              >
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${(criterion.weight / TOTAL_MARKS) * 100}%` }}
                />
              </div>
            </div>

            <span className="shrink-0 text-right">
              <span className="block font-mono text-2xl font-black leading-none text-brand">
                {criterion.weight}
              </span>
              <span className="block text-[10px] uppercase tracking-wide text-muted mt-1">
                marks
              </span>
            </span>
          </li>
        ))}
      </ol>

      {/* Total ------------------------------------------------------------ */}
      <div className="mt-3 rounded-2xl border border-brand/30 bg-brand-soft px-5 py-4 flex items-center justify-between">
        <span className="font-bold uppercase tracking-wide text-sm text-brand">
          Total
        </span>
        <span className="font-mono text-2xl font-black text-brand">
          {TOTAL_MARKS}
        </span>
      </div>

      {/* Final recommendation --------------------------------------------- */}
      <h2 className="mt-10 text-sm font-bold uppercase tracking-wide text-muted">
        Final recommendation
      </h2>
      <p className="mt-2 text-sm text-muted leading-relaxed">
        Alongside the score, each judge marks one recommendation per team.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {RECOMMENDATIONS.map((label) => (
          <li
            key={label}
            className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold"
          >
            {label}
          </li>
        ))}
      </ul>

      <p className="mt-8 text-xs text-muted">
        Judging takes place in the Main Hall on Sunday. Scoring is done on the
        printed sheet above; this page is published so teams know what they are
        being marked against.
      </p>
    </div>
  );
}
