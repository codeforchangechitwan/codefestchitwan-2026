"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireExecutive } from "@/lib/auth";
import type { Role } from "@/lib/types";

/**
 * Team management.
 *
 * Everything here goes through the executive's own client rather than the
 * service role: `teams_executive_write` and `guard_profile_self_update` both
 * already make `is_executive()` the test, so using the anon key keeps RLS as
 * the single place that decides, instead of a second copy of the rule living
 * in this file.
 */

export type TeamResult = { ok: boolean; message: string; teamId?: string };

/** Postgres unique violation — a duplicate code or name. */
const UNIQUE_VIOLATION = "23505";

type TeamFields = {
  code: string;
  name: string;
  institution: string | null;
  track: string | null;
  room: string | null;
  table_number: string | null;
  notes: string | null;
};

function readFields(formData: FormData): TeamFields | string {
  const text = (key: string) => String(formData.get(key) ?? "").trim();

  const code = text("code").toUpperCase();
  const name = text("name");

  if (code.length < 2) return "Give the team a short code — it goes on the table tent.";
  if (name.length < 2) return "Give the team a name.";

  return {
    code,
    name,
    institution: text("institution") || null,
    track: text("track") || null,
    room: text("room") || null,
    table_number: text("table_number") || null,
    notes: text("notes") || null,
  };
}

function duplicateMessage(message: string) {
  return message.includes("teams_code_key")
    ? "Another team already uses that code."
    : "Another team already uses that name.";
}

export async function createTeam(
  _prev: TeamResult | null,
  formData: FormData,
): Promise<TeamResult> {
  await requireExecutive();

  const fields = readFields(formData);
  if (typeof fields === "string") return { ok: false, message: fields };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .insert(fields)
    .select("id")
    .single();

  if (error) {
    return {
      ok: false,
      message:
        error.code === UNIQUE_VIOLATION
          ? duplicateMessage(error.message)
          : error.message,
    };
  }

  revalidatePath("/admin/teams");
  revalidatePath("/admin/submissions");

  return { ok: true, message: `${fields.name} added.`, teamId: data.id as string };
}

export async function updateTeam(
  _prev: TeamResult | null,
  formData: FormData,
): Promise<TeamResult> {
  await requireExecutive();

  const teamId = String(formData.get("team_id") ?? "");
  if (!teamId) return { ok: false, message: "Which team?" };

  const fields = readFields(formData);
  if (typeof fields === "string") return { ok: false, message: fields };

  const supabase = await createClient();
  const { error } = await supabase.from("teams").update(fields).eq("id", teamId);

  if (error) {
    return {
      ok: false,
      message:
        error.code === UNIQUE_VIOLATION
          ? duplicateMessage(error.message)
          : error.message,
    };
  }

  revalidatePath("/admin/teams");
  revalidatePath(`/admin/teams/${teamId}`);
  revalidatePath("/admin/submissions");
  revalidatePath("/team");

  return { ok: true, message: "Team updated." };
}

/**
 * Deletes a team. Members are not deleted with it — `profiles.team_id` is
 * `on delete set null`, so they simply become unassigned and can be put on
 * another team.
 */
export async function deleteTeam(teamId: string): Promise<TeamResult> {
  await requireExecutive();

  const supabase = await createClient();

  const { count } = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId);

  if (count && count > 0) {
    return {
      ok: false,
      message:
        "That team has a submission. Judging refers to it, so it cannot be deleted.",
    };
  }

  const { error } = await supabase.from("teams").delete().eq("id", teamId);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/teams");
  revalidatePath("/admin/submissions");

  return { ok: true, message: "Team deleted. Its members are now unassigned." };
}

/**
 * Puts a member on a team, or takes them off it when `teamId` is null.
 *
 * The `profiles_zz_sync_team_name` trigger refreshes the denormalised
 * `team_name` cache, so nothing here writes that column by hand.
 */
export async function setMemberTeam(
  profileId: string,
  teamId: string | null,
): Promise<TeamResult> {
  await requireExecutive();

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ team_id: teamId })
    .eq("id", profileId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/teams");
  if (teamId) revalidatePath(`/admin/teams/${teamId}`);
  revalidatePath("/admin/members");
  revalidatePath("/team");

  return { ok: true, message: teamId ? "Added to the team." : "Removed from the team." };
}

export type UnassignedMember = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  team_id: string | null;
  team_name: string | null;
};

/** Name search for the "add a member" box on a team's page. */
export async function searchMembersForTeam(
  query: string,
): Promise<UnassignedMember[]> {
  await requireExecutive();

  const term = query.trim();
  if (term.length < 2) return [];

  const escaped = term.replace(/[(),*]/g, " ").trim();
  if (!escaped) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, team_id, team_name")
    .or(`full_name.ilike.%${escaped}%,email.ilike.%${escaped}%`)
    .order("full_name")
    .limit(12);

  return (data ?? []) as UnassignedMember[];
}
