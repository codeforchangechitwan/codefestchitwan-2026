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

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
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
