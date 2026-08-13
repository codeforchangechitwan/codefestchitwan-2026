/** Shared domain types. Mirrors the enums in supabase/migrations. */

export const ROLES = [
  "executive",
  "volunteer",
  "mentor",
  "judge",
  "participant",
  "other",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  executive: "Executive Member",
  volunteer: "Volunteer",
  mentor: "Mentor",
  judge: "Judge",
  participant: "Participant",
  other: "Guest / Other",
};

/** Short form used on the identity card, where space is tight. */
export const ROLE_SHORT: Record<Role, string> = {
  executive: "EXEC",
  volunteer: "VOLUNTEER",
  mentor: "MENTOR",
  judge: "JUDGE",
  participant: "PARTICIPANT",
  other: "GUEST",
};

/** Card accent per role, so the desk can tell them apart at a glance. */
export const ROLE_COLORS: Record<Role, { bg: string; fg: string }> = {
  executive: { bg: "#001b3a", fg: "#ffffff" },
  volunteer: { bg: "#1f7a4d", fg: "#ffffff" },
  mentor: { bg: "#0079be", fg: "#ffffff" },
  judge: { bg: "#6d340e", fg: "#ffffff" },
  participant: { bg: "#8b4513", fg: "#ffffff" },
  other: { bg: "#7a6455", fg: "#ffffff" },
};

/** Roles allowed into the admin area. */
export const ADMIN_ROLES: Role[] = ["executive"];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/**
 * Scanning stations. The database column is free text and record_scan()
 * normalises anything unknown to "other" — a CHECK constraint would raise a
 * raw Postgres error in a volunteer's face during the 07:00 queue.
 */
export const STATIONS = ["registration", "exit", "canteen", "swag"] as const;
export type Station = (typeof STATIONS)[number];

export const STATION_LABELS: Record<Station, string> = {
  registration: "Registration",
  exit: "Exit",
  canteen: "Canteen",
  swag: "Swag desk",
};

/**
 * Canteen sittings. Eight of them across the three days, and the desk's only
 * real question is "has this person already had this one today?".
 *
 * Meaningful only when the station is `canteen` — record_scan discards a meal
 * sent with any other station, so "lunch at the exit gate" cannot be recorded.
 */
export const MEALS = ["breakfast", "lunch", "snacks", "dinner"] as const;
export type Meal = (typeof MEALS)[number];

export const MEAL_LABELS: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snacks: "Snacks",
  dinner: "Dinner",
};

export function isMeal(value: unknown): value is Meal {
  return typeof value === "string" && (MEALS as readonly string[]).includes(value);
}

/**
 * The sitting the timeline puts at this hour, in Kathmandu time, so the
 * scanner opens on the right one instead of making a volunteer choose while a
 * queue waits. Boundaries are generous — service runs late.
 */
export function mealAtHour(hour: number): Meal {
  if (hour < 10) return "breakfast";
  if (hour < 14) return "lunch";
  if (hour < 17) return "snacks";
  return "dinner";
}

export const SCAN_DIRECTIONS = ["in", "out"] as const;
export type ScanDirection = (typeof SCAN_DIRECTIONS)[number];

export const DIRECTION_LABELS: Record<ScanDirection, string> = {
  in: "In",
  out: "Out",
};

export function isStation(value: unknown): value is Station {
  return typeof value === "string" && (STATIONS as readonly string[]).includes(value);
}

export function isScanDirection(value: unknown): value is ScanDirection {
  return (
    typeof value === "string" && (SCAN_DIRECTIONS as readonly string[]).includes(value)
  );
}

export type Team = {
  id: string;
  /** Short human code, printed on the table tent. */
  code: string;
  name: string;
  institution: string | null;
  track: string | null;
  room: string | null;
  table_number: string | null;
  /** Assigned by the draw at /admin/wheel. Null until Sunday's ceremony. */
  pitch_order: number | null;
  notes: string | null;
  created_at: string;
};

/** One row of the team_roster() projection — never exposes qr_token. */
export type TeamMember = {
  profile_id: string;
  full_name: string;
  /** "CFC-07-3". Null for staff, who belong to no team. */
  participant_code: string | null;
  role: Role;
  institution: string | null;
  room: string | null;
  checked_in_at: string | null;
  is_self: boolean;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  /**
   * Human-readable per-person ID, "CFC-07-3" — team code plus seat, seat 1
   * being the team leader. Null for staff, who belong to no team.
   */
  participant_code: string | null;
  role: Role;
  /** Executive portfolio ("Tech Lead") or a judge's affiliation. Display only. */
  title: string | null;
  food_preference: string | null;
  allergy: string | null;
  /**
   * Health information from the registration form. RLS keeps `profiles`
   * executive-only, and participant_directory() omits this column, so desk
   * volunteers never receive it.
   */
  medical_note: string | null;
  /**
   * GitHub handle only, never a URL — src/lib/github.ts reduces a pasted
   * profile link to this. Set by the participant themselves.
   */
  github_username: string | null;
  team_id: string | null;
  /** Denormalised cache of teams.name, kept in sync by a database trigger. */
  team_name: string | null;
  institution: string | null;
  phone: string | null;
  room: string | null;
  avatar_url: string | null;
  qr_token: string;
  must_change_password: boolean;
  checked_in_at: string | null;
  is_active: boolean;
  created_at: string;
};

export type SubmissionStatus = "draft" | "submitted";

export type Submission = {
  id: string;
  team_id: string;
  title: string;
  description: string;
  repo_url: string | null;
  demo_url: string | null;
  video_url: string | null;
  deck_url: string | null;
  docs_url: string | null;
  screenshots: string[];
  status: SubmissionStatus;
  submitted_at: string | null;
  updated_at: string;
};

/** Single-row table of event-day levers. */
export type EventSettings = {
  submission_deadline: string;
  submissions_open: boolean;
  /** While false, the judging panel sees no submissions at all. */
  judging_open: boolean;
};

/** One row of participant_directory() — never exposes qr_token or health data. */
export type DirectoryEntry = {
  profile_id: string;
  full_name: string;
  /** "CFC-07-3". Null for staff. Also matched by the directory's search. */
  participant_code: string | null;
  email: string;
  role: Role;
  title: string | null;
  team_name: string | null;
  institution: string | null;
  room: string | null;
  phone: string | null;
  food_preference: string | null;
  checked_in_at: string | null;
  is_active: boolean;
};

export type ScheduleEvent = {
  id: string;
  day: string;
  day_label: string;
  starts_at: string | null;
  ends_at: string | null;
  time_label: string;
  title: string;
  zone: string | null;
  description: string | null;
  sort_order: number;
  visible_to: Role[] | null;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  urgent: boolean;
  audience: Role[] | null;
  created_at: string;
};

export type Quiz = {
  id: string;
  title: string;
  description: string | null;
  time_limit_seconds: number;
  is_published: boolean;
  opens_at: string | null;
  closes_at: string | null;
  created_at: string;
};

export type QuizQuestion = {
  id: string;
  quiz_id: string;
  prompt: string;
  options: string[];
  /** Never sent to the browser before an attempt is graded. */
  correct_index?: number;
  points: number;
  sort_order: number;
};

export type QuizAttempt = {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number;
  total_points: number;
  started_at: string;
  submitted_at: string | null;
};
