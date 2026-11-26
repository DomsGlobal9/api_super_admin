import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Whether what the admin typed into a "type the name to confirm" box names the
 * thing. Surrounding whitespace and letter case do not count: a company name
 * saved as "sirimalle " (trailing space) must still be confirmable by typing
 * "sirimalle". Nothing typed, or nothing to match, never confirms.
 */
export function confirmTextMatches(typed: string, expected: string | null | undefined): boolean {
  const want = (expected ?? '').trim().toLowerCase();
  if (!want) return false;
  return typed.trim().toLowerCase() === want;
}

// ---------------------------------------------------------------------------
// Text pasted from WhatsApp, Excel, PDFs or contacts apps often carries
// characters nobody can see: zero-width spaces, a byte-order mark, a soft
// hyphen, or a non-breaking space where a space should be. In an email box the
// browser then refuses the address ("A part followed by '@' should not contain
// the symbol ''"), and in a plain text box the junk is saved as part of the
// name ("sirimalle "), where it later breaks exact comparisons.
// ---------------------------------------------------------------------------

/** Zero-width space/joiners, word joiner, byte-order mark, soft hyphen. */
const INVISIBLE_CHARS = /[\u200B-\u200D\u2060\uFEFF\u00AD]/g;
/** Spaces that look like a space but are not U+0020. */
const UNUSUAL_SPACES = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g;

/**
 * Safe to run on every keystroke: drops invisible characters and turns
 * look-alike spaces into ordinary ones. Never trims, so typing "Acme " on the
 * way to "Acme Corp" still works.
 */
export function normaliseTyping(value: string): string {
  return value.replace(INVISIBLE_CHARS, '').replace(UNUSUAL_SPACES, ' ');
}

/** A one-line value as it should be stored: normalised, trimmed, single spaces. */
export function cleanLine(value: string): string {
  return normaliseTyping(value).replace(/\s+/g, ' ').trim();
}

/** A multi-line value (notes): normalised and trimmed, line breaks kept. */
export function cleanBlock(value: string): string {
  return normaliseTyping(value).trim();
}

/**
 * A value that can never contain a space, such as an email address or a phone
 * number: every kind of whitespace is removed. "98765 43210" becomes
 * "9876543210"; "label.x@gmail.com" followed by a pasted U+200B is accepted.
 */
export function cleanCompact(value: string): string {
  return normaliseTyping(value).replace(/\s+/g, '');
}
