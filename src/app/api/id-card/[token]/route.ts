import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/supabase/server";
import { renderQrSvg } from "@/lib/qr";

/**
 * Downloadable QR for an identity card.
 *
 * Members may only fetch their own code; executives may fetch anyone's so they
 * can reprint a lost card. The token in the URL is never trusted on its own.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/id-card/[token]">,
) {
  const { token: raw } = await ctx.params;
  const token = raw.replace(/\.svg$/i, "").toLowerCase();

  const session = await getSessionProfile();
  if (!session) {
    return new NextResponse("Sign in first.", { status: 401 });
  }

  const isOwner = session.profile.qr_token === token;
  const isExecutive = session.profile.role === "executive";

  if (!isOwner && !isExecutive) {
    return new NextResponse("Not your card.", { status: 403 });
  }

  const svg = await renderQrSvg(token, { margin: 2 });

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Personal data: never store in a shared cache.
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="codefest-2026-${token.slice(0, 8)}.svg"`,
    },
  });
}
