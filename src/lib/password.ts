import { randomInt } from "node:crypto";

/*
 * Ambiguous glyphs (0/O, 1/l/I) are omitted: these passwords get read off a
 * phone screen and typed on another device at the registration desk.
 */
const UPPER = "ABCDEFGHJKMNPQRSTUVWXYZ";
const LOWER = "abcdefghjkmnpqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%&*";

const ALPHABET = UPPER + LOWER + DIGITS + SYMBOLS;

/** Cryptographically random temporary password, e.g. "Kf7t-Rp3x-Qm9z". */
export function generatePassword(length = 14): string {
  const required = [
    UPPER[randomInt(UPPER.length)],
    LOWER[randomInt(LOWER.length)],
    DIGITS[randomInt(DIGITS.length)],
    SYMBOLS[randomInt(SYMBOLS.length)],
  ];

  const rest = Array.from(
    { length: Math.max(length - required.length, 0) },
    () => ALPHABET[randomInt(ALPHABET.length)],
  );

  const chars = [...required, ...rest];

  // Fisher-Yates, so the required characters aren't always at the front.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}
