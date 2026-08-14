/**
 * The official judging rubric, transcribed from the signed evaluation sheet
 * (public/codefest-2026-judging-sheet.pdf).
 *
 * Scoring is on paper this year — see the note in src/app/(member)/judge/page.tsx
 * — so this file is not a scoring system. It is the published version of what
 * the panel is marking against, which teams are entitled to know before they
 * pitch, and the page renders it straight from here so the two can never
 * disagree about a weight.
 *
 * The total is computed, never written down twice. A criterion whose weight is
 * edited moves the total with it, and TOTAL_MARKS below is the only number the
 * page prints.
 */

export type Criterion = {
  /** Row number on the paper sheet — judges call these out by number. */
  no: number;
  /** The heading as printed, minus the bracketed short name. */
  name: string;
  /** The bracketed short name on the sheet: "(Creativity)", "(Team)". */
  short: string;
  description: string;
  weight: number;
};

export const CRITERIA: Criterion[] = [
  {
    no: 1,
    name: "Solution Innovation & Uniqueness",
    short: "Creativity",
    description: "Originality, creativity, novelty, and problem–solution fit.",
    weight: 6,
  },
  {
    no: 2,
    name: "Technology & Prototype Execution",
    short: "Technology",
    description: "Working prototype, technical depth and functionality.",
    weight: 10,
  },
  {
    no: 3,
    name: "Business Model (Financial Viability) & Implementation Feasibility",
    short: "Feasibility",
    description: "Practicality, scalability and revenue/business model.",
    weight: 10,
  },
  {
    no: 4,
    name: "Impact in the Community (SDG) & Market Relevance",
    short: "Impact",
    description:
      "Social, economic and environmental impact, target users and SDG alignment.",
    weight: 5,
  },
  {
    no: 5,
    name: "Pitch & Presentation",
    short: "Presentation",
    description: "Storytelling, clarity, demo quality and response to questions.",
    weight: 5,
  },
  {
    no: 6,
    name: "Team Capability & Collaboration",
    short: "Team",
    description:
      "Technical and domain competence, role distribution and teamwork.",
    weight: 4,
  },
];

/** 40 on the printed sheet. Derived so an edited weight cannot desync it. */
export const TOTAL_MARKS = CRITERIA.reduce((sum, c) => sum + c.weight, 0);

/** The four boxes at the foot of the sheet, in the order they are printed. */
export const RECOMMENDATIONS = [
  "Winner",
  "Runner-up",
  "Shortlist",
  "Not Shortlisted",
] as const;

/** Served from public/ so judges can print it and teams can read it. */
export const JUDGING_SHEET_PDF = "/codefest-2026-judging-sheet.pdf";
