export function normalizeEmail(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

/** Practical inbox check. Requires a dotted domain and rejects headers/newlines. */
export function isEmail(value: string): boolean {
  if (value.length < 6 || value.length > 254) return false;
  if (/[\s<>]/.test(value)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
