import "server-only";

import nodemailer from "nodemailer";
import { getSmtpConfig, SITE_URL } from "@/lib/env";
import { ROLE_LABELS, type Role } from "@/lib/types";

export type MailResult =
  | { sent: true }
  | { sent: false; reason: string };

function transporter() {
  const config = getSmtpConfig();
  if (!config) return null;

  return {
    from: config.from,
    client: nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    }),
  };
}

/**
 * Mails a newly provisioned member their credentials.
 *
 * Returns a result rather than throwing so that a bulk import can carry on
 * and report which addresses failed.
 */
export async function sendCredentialsEmail(params: {
  to: string;
  fullName: string;
  role: Role;
  password: string;
}): Promise<MailResult> {
  const mailer = transporter();
  if (!mailer) {
    return {
      sent: false,
      reason:
        "SMTP is not configured (set SMTP_HOST, SMTP_USER, SMTP_PASSWORD). The password was still created — copy it from the admin panel and send it manually.",
    };
  }

  const loginUrl = `${SITE_URL}/login`;
  const roleLabel = ROLE_LABELS[params.role];

  const text = [
    `Namaste ${params.fullName},`,
    "",
    `Your Codefest Chitwan 2026 account is ready. You are registered as: ${roleLabel}.`,
    "",
    `Sign in at: ${loginUrl}`,
    `Email:    ${params.to}`,
    `Password: ${params.password}`,
    "",
    "You'll be asked to choose your own password the first time you sign in.",
    "",
    "Inside the app you'll find the 14-16 August schedule, your digital identity card with the QR code used at the registration desk, quizzes and live announcements.",
    "",
    "Forbes College, Bharatpur-2, Kshetrapur",
    "Questions? execution@codefestnepal.com",
    "",
    "- Code for Change | Let code lead the change",
  ].join("\n");

  const html = `
<div style="margin:0;padding:24px;background:#fff8f3;font-family:Arial,Helvetica,sans-serif;color:#2a1a10;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #ecd9c9;border-radius:16px;overflow:hidden;">
    <div style="background:#8b4513;padding:20px 24px;">
      <p style="margin:0;font-size:18px;font-weight:bold;color:#ffffff;">Codefest 2026 &mdash; Chitwan</p>
      <p style="margin:4px 0 0;font-size:13px;color:#f6e3d3;">Forbes College &middot; 14&ndash;16 August</p>
    </div>

    <div style="padding:24px;">
      <p style="margin:0 0 12px;font-size:15px;">Namaste ${escapeHtml(params.fullName)},</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
        Your Codefest Chitwan 2026 account is ready. You are registered as
        <strong style="color:#8b4513;">${escapeHtml(roleLabel)}</strong>.
      </p>

      <table role="presentation" style="width:100%;border-collapse:collapse;background:#fdf1e8;border-radius:12px;margin:0 0 20px;">
        <tr>
          <td style="padding:14px 16px 4px;font-size:12px;color:#7a6455;">Email</td>
        </tr>
        <tr>
          <td style="padding:0 16px 12px;font-size:15px;font-weight:bold;">${escapeHtml(params.to)}</td>
        </tr>
        <tr>
          <td style="padding:0 16px 4px;font-size:12px;color:#7a6455;">Temporary password</td>
        </tr>
        <tr>
          <td style="padding:0 16px 16px;font-size:18px;font-weight:bold;font-family:monospace;letter-spacing:1px;color:#8b4513;">${escapeHtml(params.password)}</td>
        </tr>
      </table>

      <a href="${loginUrl}" style="display:inline-block;background:#8b4513;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;font-size:15px;">Sign in</a>

      <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#7a6455;">
        You&rsquo;ll be asked to choose your own password the first time you sign in.
        Inside you&rsquo;ll find the full schedule, your digital identity card with the
        QR code used at the registration desk, quizzes and live announcements.
      </p>

      <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#7a6455;">
        Please don&rsquo;t share this password. If you didn&rsquo;t register for Codefest,
        reply to this email and we&rsquo;ll remove the account.
      </p>
    </div>

    <div style="background:#fdf1e8;padding:16px 24px;font-size:12px;color:#7a6455;">
      Code for Change &mdash; let code lead the change<br />
      <a href="mailto:execution@codefestnepal.com" style="color:#8b4513;">execution@codefestnepal.com</a>
      &middot;
      <a href="https://codefestnepal.com" style="color:#8b4513;">codefestnepal.com</a>
    </div>
  </div>
</div>`;

  try {
    await mailer.client.sendMail({
      from: mailer.from,
      to: params.to,
      subject: "Your Codefest Chitwan 2026 login details",
      text,
      html,
    });
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      reason: error instanceof Error ? error.message : "Unknown SMTP error",
    };
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
