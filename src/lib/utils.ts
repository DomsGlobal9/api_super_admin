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
