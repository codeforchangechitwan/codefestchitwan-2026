import QRCode from "qrcode";
import { SITE_URL } from "@/lib/env";

/**
 * The URL encoded into an identity-card QR.
 *
 * A URL rather than a bare token so that any phone camera resolves it to the
 * verification page; our own scanner pulls the token back out of the path.
 */
export function qrTargetUrl(token: string) {
  return `${SITE_URL}/verify/${token}`;
}

/** Extracts a card token from a scanned payload (URL or bare UUID). */
export function parseQrPayload(raw: string): string | null {
  const value = raw.trim();
  const uuid =
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.exec(value);
  return uuid ? uuid[0].toLowerCase() : null;
}

/**
 * Renders the QR as an inline SVG string.
 *
 * SVG (not a PNG data URL) so the card stays crisp when a participant zooms in
 * under a scanner, and so it survives being printed onto a physical card.
 */
export async function renderQrSvg(
  token: string,
  options?: { margin?: number },
): Promise<string> {
  return QRCode.toString(qrTargetUrl(token), {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: options?.margin ?? 1,
    color: { dark: "#2a1a10", light: "#ffffff" },
  });
}
