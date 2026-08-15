"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireExecutive } from "@/lib/auth";
import { generatePassword } from "@/lib/password";
import { sendCredentialsEmail } from "@/lib/mail";
import { FORM_LABEL_MAX, FORM_NOTE_MAX, isFormUrl } from "@/lib/form-link";
import { isRole, ROLES, type Role } from "@/lib/types";

export type MemberResult = {
  ok: boolean;
  message: string;
  /** Shown so staff can pass it on when SMTP is unavailable. */
  password?: string;
  email?: string;
};

/**
 * Creates an account for someone on the registration list and mails them the
 * password. This is the only way an account comes into existence — there is no
 * public sign-up anywhere in the app.
 */
export async function createMember(
  _prev: MemberResult | null,
  formData: FormData,
): Promise<MemberResult> {
  const { profile: actor } = await requireExecutive();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const roleValue = String(formData.get("role") ?? "participant");
  const teamName = String(formData.get("team_name") ?? "").trim();
  const institution = String(formData.get("institution") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }
  if (fullName.length < 2) {
    return { ok: false, message: "Enter the member's full name." };
  }
  if (!isRole(roleValue)) {
    return { ok: false, message: "Pick a valid category." };
  }
  const role: Role = roleValue;

  const admin = createAdminClient();
  const password = generatePassword();

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
      team_name: teamName || null,
      institution: institution || null,
      phone: phone || null,
    },
  });

  if (error || !created.user) {
    const already = error?.message?.toLowerCase().includes("already");
    return {
      ok: false,
      message: already
        ? "An account already exists for that email. Use “Resend password” instead."
        : (error?.message ?? "Couldn't create the account."),
    };
  }

  // The trigger created the profile; make sure the details match exactly.
  await admin
    .from("profiles")
    .update({
      full_name: fullName,
      role,
      team_name: teamName || null,
      institution: institution || null,
      phone: phone || null,
      must_change_password: true,
    })
    .eq("id", created.user.id);

  // Mark the registration row as provisioned, if there is one.
  await admin
    .from("registrations")
    .update({ provisioned_at: new Date().toISOString(), provisioned_by: actor.id })
    .eq("email", email);

  const mail = await sendCredentialsEmail({
    to: email,
    fullName,
    role,
    password,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/members");

  return mail.sent
    ? { ok: true, message: `Account created and password emailed to ${email}.`, email }
    : {
        ok: true,
        message: `Account created, but the email could not be sent (${mail.reason}) — send this password manually.`,
        password,
        email,
      };
}

/** Issues a fresh password and mails it again. */
export async function resendPassword(userId: string): Promise<MemberResult> {
  await requireExecutive();

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("email, full_name, role")
    .eq("id", userId)
    .single();

  if (!profile) return { ok: false, message: "Member not found." };

  const password = generatePassword();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return { ok: false, message: error.message };

  await admin
    .from("profiles")
    .update({ must_change_password: true })
    .eq("id", userId);

  const mail = await sendCredentialsEmail({
    to: profile.email as string,
    fullName: profile.full_name as string,
    role: profile.role as Role,
    password,
  });

  revalidatePath("/admin/members");

  return mail.sent
    ? { ok: true, message: `New password emailed to ${profile.email}.` }
    : {
        ok: true,
        message: `Password reset, but the email failed (${mail.reason}).`,
        password,
        email: profile.email as string,
      };
}

/** Suspends or restores access without deleting the account. */
export async function setMemberActive(userId: string, isActive: boolean) {
  await requireExecutive();
  const admin = createAdminClient();
  await admin.from("profiles").update({ is_active: isActive }).eq("id", userId);
  revalidatePath("/admin/members");
  return { ok: true, message: isActive ? "Member restored." : "Member suspended." };
}

/** Rotates a card's QR token, invalidating any copy that leaked. */
export async function rotateQrToken(userId: string): Promise<MemberResult> {
  await requireExecutive();
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ qr_token: crypto.randomUUID() })
    .eq("id", userId);

  revalidatePath("/admin/members");
  return error
    ? { ok: false, message: error.message }
    : { ok: true, message: "New QR issued — the old card no longer scans." };
}

export async function setMemberRole(userId: string, role: string) {
  await requireExecutive();
  if (!isRole(role)) return { ok: false, message: "Unknown category." };

  const admin = createAdminClient();
  await admin.from("profiles").update({ role }).eq("id", userId);
  revalidatePath("/admin/members");
  return { ok: true, message: "Category updated." };
}

export type AnnouncementResult = { ok: boolean; message: string };

type AnnouncementFields = {
  title: string;
  body: string;
  urgent: boolean;
  audience: Role[] | null;
};

/**
 * The one reading of the announcement form, shared by posting and editing so
 * the two cannot drift apart on what counts as valid or on who the audience
 * ends up being.
 *
 * Returns the error sentence as a plain string, the same shape the team
 * actions use.
 */
function readAnnouncementFields(formData: FormData): AnnouncementFields | string {
  const title = String(formData.get("title") ?? "").trim();
  // Normalised to plain newlines on the way in: the textarea submits CRLF and
  // the rendered body is `whitespace-pre-line`, where a stray carriage return
  // can show up as an extra gap.
  const body = String(formData.get("body") ?? "")
    .replace(/\r\n?/g, "\n")
    .trim();
  const urgent = formData.get("urgent") === "on";
  const audience = ROLES.filter((role) => formData.get(`audience_${role}`) === "on");

  if (title.length < 3) return "Give the notice a title.";
  if (body.length < 3) return "Write the announcement body.";

  return {
    title,
    body,
    urgent,
    // No boxes ticked — or every box ticked — means everyone.
    audience: audience.length > 0 && audience.length < ROLES.length ? audience : null,
  };
}

/** Every screen that shows an announcement, after any write. */
function revalidateAnnouncements() {
  revalidatePath("/announcements");
  revalidatePath("/dashboard");
  revalidatePath("/admin/announcements");
}

export async function postAnnouncement(
  _prev: AnnouncementResult | null,
  formData: FormData,
): Promise<AnnouncementResult> {
  const { profile } = await requireExecutive();

  const fields = readAnnouncementFields(formData);
  if (typeof fields === "string") return { ok: false, message: fields };

  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .insert({ ...fields, created_by: profile.id });

  if (error) return { ok: false, message: error.message };

  revalidateAnnouncements();

  return { ok: true, message: "Announcement posted." };
}

/**
 * Fixes a posted notice in place — a wrong deadline, a broken form link, a
 * typo that is already on every phone in the hall.
 *
 * `created_at` is left alone deliberately: an edited notice keeps its place in
 * the list rather than jumping to the top, so correcting a typo does not read
 * as a second announcement. The pulse trigger fires on the update, so open
 * tabs pick the correction up without a refresh.
 */
export async function updateAnnouncement(
  id: string,
  _prev: AnnouncementResult | null,
  formData: FormData,
): Promise<AnnouncementResult> {
  await requireExecutive();

  const fields = readAnnouncementFields(formData);
  if (typeof fields === "string") return { ok: false, message: fields };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("announcements")
    .update(fields, { count: "exact" })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };
  if (!count) return { ok: false, message: "That announcement no longer exists." };

  revalidateAnnouncements();

  return { ok: true, message: "Announcement updated." };
}

/** Takes a notice down everywhere. There is no undo, hence the confirm step. */
export async function deleteAnnouncement(id: string): Promise<AnnouncementResult> {
  await requireExecutive();

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidateAnnouncements();

  return { ok: true, message: "Announcement deleted." };
}

export async function setQuizPublished(quizId: string, published: boolean) {
  await requireExecutive();
  const supabase = await createClient();
  const { error } = await supabase
    .from("quizzes")
    .update({ is_published: published })
    .eq("id", quizId);

  revalidatePath("/admin/quizzes");
  revalidatePath("/quiz");

  return error
    ? { ok: false, message: error.message }
    : { ok: true, message: published ? "Quiz published." : "Quiz hidden." };
}

/**
 * The event-day lever for "the wifi died, give them ten more minutes". RLS
 * reads these two values on every submission write, so closing the window here
 * genuinely stops writes rather than only hiding the form.
 */
export async function setSubmissionWindow(
  deadlineIso: string,
  open: boolean,
): Promise<{ ok: boolean; message: string }> {
  const { profile: actor } = await requireExecutive();

  const deadline = new Date(deadlineIso);
  if (Number.isNaN(deadline.getTime())) {
    return { ok: false, message: "That deadline isn't a valid date and time." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("event_settings")
    .update({
      submission_deadline: deadline.toISOString(),
      submissions_open: open,
      updated_at: new Date().toISOString(),
      updated_by: actor.id,
    })
    .eq("id", true);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/submissions");
  revalidatePath("/submit");

  return {
    ok: true,
    message: open ? "Submission window updated." : "Submissions closed.",
  };
}

/**
 * Opens the entry list to the judging panel.
 *
 * Separate from the submission window on purpose. Submissions close at the
 * deadline; judging starts when the panel is actually seated, which on Sunday
 * is a later moment and occasionally a much later one. Until this is on, a
 * judge's page is empty because RLS returns them nothing — not because the UI
 * declines to draw it.
 */
export async function setJudgingOpen(
  open: boolean,
): Promise<{ ok: boolean; message: string }> {
  const { profile: actor } = await requireExecutive();

  const supabase = await createClient();
  const { error } = await supabase
    .from("event_settings")
    .update({
      judging_open: open,
      updated_at: new Date().toISOString(),
      updated_by: actor.id,
    })
    .eq("id", true);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/submissions");
  revalidatePath("/judge");

  return {
    ok: true,
    message: open
      ? "Judging is open — the panel can now see every submitted entry."
      : "Judging closed. Judges can no longer see entries.",
  };
}

/**
 * Points the public form button at a Google Form — or switches it off.
 *
 * The database has the same four CHECK constraints, and they are the ones that
 * actually hold. These checks exist so a mistyped URL comes back as a sentence
 * an organiser can act on instead of a Postgres constraint name.
 */
export async function saveFormLink(
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  const { profile: actor } = await requireExecutive();

  const url = String(formData.get("form_url") ?? "").trim();
  const label = String(formData.get("form_label") ?? "").trim();
  const note = String(formData.get("form_note") ?? "").trim();
  const enabled = formData.get("form_enabled") === "on";

  if (!label) {
    return { ok: false, message: "Give the button some words." };
  }
  if (label.length > FORM_LABEL_MAX) {
    return {
      ok: false,
      message: `Keep the button text under ${FORM_LABEL_MAX} characters.`,
    };
  }
  if (note.length > FORM_NOTE_MAX) {
    return {
      ok: false,
      message: `Keep the note under ${FORM_NOTE_MAX} characters.`,
    };
  }
  if (url && !isFormUrl(url)) {
    return {
      ok: false,
      message:
        "That doesn't look like a link. Paste the whole thing, starting with https:// — a Google Form's Send → link tab gives you one.",
    };
  }
  // Not a silent correction: switching the button on is the whole point of the
  // screen, and doing it with no destination has to fail loudly.
  if (enabled && !url) {
    return { ok: false, message: "Add the form link before switching it on." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("event_settings")
    .update({
      form_url: url || null,
      form_label: label,
      form_note: note || null,
      form_enabled: enabled,
      updated_at: new Date().toISOString(),
      updated_by: actor.id,
    })
    .eq("id", true);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/admin/form-link");

  return {
    ok: true,
    message: enabled
      ? "Saved. The button is live on the homepage and the dashboard."
      : "Saved. The button is hidden — nobody sees it until you switch it on.",
  };
}
