"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireExecutive } from "@/lib/auth";

export type HackathonResult = { ok: boolean; message: string };

/*
 * Bounds a typo has to clear before it reaches the clock.
 *
 * NOT exported, and nothing else here may be either: a "use server" file can
 * only export async functions. Exporting a plain constant throws
 * "can only export async functions, found number" when the module is
 * evaluated, which surfaces as a 500 on the page and React #441 in the
 * browser — and neither tsc, eslint, nor next build catches it.
 * The shared default lives in lib/hackathon.ts as HACK_DEFAULT_SECONDS.
 */
const MIN_DURATION_SECONDS = 3600;
const MAX_DURATION_SECONDS = 96 * 3600;

function refresh() {
  revalidatePath("/hackathon");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
}

/**
 * Starts the 36-hour clock.
 *
 * Postgres decides the instant and the end timestamp, not this process and not
 * the coordinator's phone — every device then counts down to the one stored
 * `hack_ends_at`. set_hackathon('start') is a no-op once the clock is running,
 * so a second press on stage cannot restart a countdown that 150 people are
 * already watching.
 */
export async function startHackathon(): Promise<HackathonResult> {
  await requireExecutive();

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_hackathon", { action: "start" });

  if (error) return { ok: false, message: error.message };

  refresh();
  return { ok: true, message: "The hackathon clock is running." };
}

export async function resetHackathon(): Promise<HackathonResult> {
  await requireExecutive();

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_hackathon", { action: "reset" });

  if (error) return { ok: false, message: error.message };

  refresh();
  return { ok: true, message: "Clock reset — ready to rehearse." };
}

/**
 * Moves the deadline on a running clock. Signed: negative pulls it in.
 *
 * Separate from editing the duration on purpose. Teams pace themselves against
 * the number on the wall, so moving it is a decision someone makes out loud,
 * not a side effect of correcting a settings field.
 */
export async function extendHackathon(
  minutes: number,
): Promise<HackathonResult> {
  await requireExecutive();

  if (!Number.isFinite(minutes) || minutes === 0) {
    return { ok: false, message: "Pick a non-zero number of minutes." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_hackathon", {
    action: "extend",
    seconds: Math.round(minutes) * 60,
  });

  if (error) return { ok: false, message: error.message };

  refresh();
  const label = minutes > 0 ? `+${minutes}` : `${minutes}`;
  return { ok: true, message: `Deadline moved by ${label} minutes.` };
}

export async function saveHackathonSettings(
  formData: FormData,
): Promise<HackathonResult> {
  await requireExecutive();

  const coordinatorName = String(formData.get("coordinator_name") ?? "").trim();
  const coordinatorTitle = String(formData.get("coordinator_title") ?? "").trim();
  const hours = Number(formData.get("hours"));

  if (!Number.isFinite(hours) || hours <= 0) {
    return { ok: false, message: "Hours must be a positive number." };
  }

  const seconds = Math.round(hours * 3600);
  if (seconds < MIN_DURATION_SECONDS || seconds > MAX_DURATION_SECONDS) {
    return { ok: false, message: "Pick a length between 1 and 96 hours." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_hackathon", {
    action: "details",
    seconds,
    coordinator_name: coordinatorName,
    coordinator_title: coordinatorTitle,
  });

  if (error) return { ok: false, message: error.message };

  refresh();
  return { ok: true, message: "Saved. Takes effect at the next start." };
}
