import { NextResponse } from "next/server";
import JSZip from "jszip";
import { requireExecutiveApi } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { renderQrPng } from "@/lib/qr";
import { isRole, ROLE_SHORT, type Profile } from "@/lib/types";

/**
 * Every member's QR as a PNG, zipped, for the badge print run.
 *
 * The codes encode the same /verify/<token> URL the in-app identity card shows,
 * so a printed badge and a phone screen scan identically at the desk — a
 * printed batch that encoded bare tokens would stop resolving the day the
 * scanner is a volunteer's camera app rather than ours.
 *
 * `?role=participant` narrows the run, because participant badges and staff
 * badges are usually printed on different stock.
 *
 * This is a bulk export of live card credentials. It is executives-only, it is
 * never cached, and rotating a member's QR in /admin/members invalidates any
 * badge printed from an older run.
 */

/** Roughly 60KB per code; 400 members is a ~24MB zip, which is fine to stream. */
const MAX_BADGES = 600;

function safeFilename(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "member"
  );
}

export async function GET(request: Request) {
  const { response } = await requireExecutiveApi();
  if (response) return response;

  const roleParam = new URL(request.url).searchParams.get("role");
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("id, full_name, role, team_name, qr_token, is_active")
    .eq("is_active", true)
    .order("full_name")
    .limit(MAX_BADGES);

  if (roleParam && isRole(roleParam)) {
    query = query.eq("role", roleParam);
  }

  const { data, error } = await query;
  if (error) {
    return new NextResponse(`Could not read the roster: ${error.message}`, {
      status: 500,
    });
  }

  const members = (data ?? []) as Pick<
    Profile,
    "id" | "full_name" | "role" | "team_name" | "qr_token"
  >[];

  if (members.length === 0) {
    return new NextResponse("No active members to print badges for.", {
      status: 404,
    });
  }

  const zip = new JSZip();

  // Grouped into a folder per category so the print run can be split by stock.
  for (const member of members) {
    const png = await renderQrPng(member.qr_token);
    const folder = ROLE_SHORT[member.role].toLowerCase();
    const name = safeFilename(member.full_name);
    zip.file(`${folder}/${name}-${member.qr_token.slice(0, 8)}.png`, png);
  }

  zip.file(
    "README.txt",
    [
      "Codefest Chitwan 2026 — identity card QR codes",
      "",
      `${members.length} active ${members.length === 1 ? "member" : "members"}, ` +
        `exported ${new Date().toISOString()}.`,
      "",
      "Each code resolves to that member's verification page. The filename",
      "suffix is the first 8 characters of the card token, which is what the",
      "admin panel shows when a card is reissued.",
      "",
      "These are live credentials: anyone who can scan a code can present that",
      "member's card. Do not share this archive outside the organising team.",
    ].join("\n"),
  );

  // arraybuffer rather than uint8array: a Uint8Array over a generic
  // ArrayBufferLike is not assignable to BodyInit, and an ArrayBuffer is.
  const archive = await zip.generateAsync({
    type: "arraybuffer",
    compression: "DEFLATE",
    // PNG is already deflated; compressing it again costs time and saves ~0%.
    compressionOptions: { level: 1 },
  });

  const suffix = roleParam && isRole(roleParam) ? `-${roleParam}` : "";

  return new NextResponse(archive, {
    headers: {
      "Content-Type": "application/zip",
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="codefest-2026-badges${suffix}.zip"`,
    },
  });
}
