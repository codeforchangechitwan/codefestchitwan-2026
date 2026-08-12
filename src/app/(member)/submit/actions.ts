"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";

export type SubmissionResult = { ok: boolean; message: string } | null;

const MAX_SCREENSHOTS = 4;

/** Mirrors the database check in stamp_submission(). */
function isHttpUrl(value: string) {
  return /^https?:\/\/\S+$/.test(value) && value.length <= 500;
}

function optionalUrl(formData: FormData, field: string) {
  const value = String(formData.get(field) ?? "").trim();
  return value === "" ? null : value;
}

export async function saveSubmission(
  _prev: SubmissionResult,
  formData: FormData,
): Promise<SubmissionResult> {
  const { profile } = await requireMember();

  if (!profile.team_id) {
    return { ok: false, message: "You're not on a team yet — ask at the desk." };
  }

  const isFinal = String(formData.get("intent") ?? "") === "final";

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const repoUrl = optionalUrl(formData, "repo_url");
  const demoUrl = optionalUrl(formData, "demo_url");
  const videoUrl = optionalUrl(formData, "video_url");
  const deckUrl = optionalUrl(formData, "deck_url");
  const docsUrl = optionalUrl(formData, "docs_url");
  const screenshots = String(formData.get("screenshots") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  // Validate before touching the database, so the message is friendly rather
  // than a raised Postgres exception.
  for (const [label, value] of [
    ["Repository link", repoUrl],
    ["Demo link", demoUrl],
    ["Video link", videoUrl],
    ["Pitch deck link", deckUrl],
    ["Documentation link", docsUrl],
  ] as const) {
    if (value && !isHttpUrl(value)) {
      return { ok: false, message: `${label} must start with http:// or https://` };
    }
  }

  if (screenshots.length > MAX_SCREENSHOTS) {
    return {
      ok: false,
      message: `That's ${screenshots.length} screenshots — ${MAX_SCREENSHOTS} is the limit.`,
    };
  }
  if (screenshots.some((shot) => !isHttpUrl(shot))) {
    return {
      ok: false,
      message: "Every screenshot must be a full link starting with http:// or https://",
    };
  }

  if (isFinal && title === "") {
    return { ok: false, message: "Give the project a title before submitting." };
  }
  if (isFinal && !repoUrl) {
    return { ok: false, message: "A repository link is required to submit." };
  }

  const payload = {
    title,
    description,
    repo_url: repoUrl,
    demo_url: demoUrl,
    video_url: videoUrl,
    deck_url: deckUrl,
    docs_url: docsUrl,
    screenshots,
    status: isFinal ? "submitted" : "draft",
  };

  // The session client on purpose: RLS is the real deadline, not this form.
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("submissions")
    .select("id")
    .eq("team_id", profile.team_id)
    .maybeSingle();

  // Branch explicitly rather than upserting, so a policy rejection surfaces as
  // a 42501 instead of a silent zero-row update.
  const { error } = existing
    ? await supabase.from("submissions").update(payload).eq("id", existing.id)
    : await supabase
        .from("submissions")
        .insert({ ...payload, team_id: profile.team_id });

  if (error) {
    if (error.code === "42501") {
      return {
        ok: false,
        message:
          "The submission window has closed. Speak to the desk in Building A.",
      };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/submit");
  revalidatePath("/team");
  revalidatePath("/admin/submissions");

  return {
    ok: true,
    message: isFinal
      ? "Submitted. You can still edit and re-submit until the deadline."
      : "Draft saved.",
  };
}
