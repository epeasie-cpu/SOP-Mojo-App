/** Word-boundary label helpers so canvas cards never chop mid-word. */

export const TITLE_MAX = 56;
export const BODY_VISIBLE_MAX = 160;

export function clipAtWord(text: string, maxChars: number): { preview: string; truncated: boolean } {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return { preview: "", truncated: false };
  if (normalized.length <= maxChars) return { preview: normalized, truncated: false };
  const slice = normalized.slice(0, maxChars).trimEnd();
  const at = slice.lastIndexOf(" ");
  const preview = (at >= Math.floor(maxChars * 0.45) ? slice.slice(0, at) : slice).trimEnd();
  return { preview, truncated: true };
}

export function splitLabel(label: string): { title: string; body: string } {
  const trimmed = label.replace(/\s+/g, " ").trim();
  if (!trimmed) return { title: "", body: "" };
  const sentence = trimmed.match(/^(.+?[.?!])(?:\s+|$)([\s\S]*)$/);
  if (sentence && sentence[1].length <= TITLE_MAX + 20) {
    return { title: sentence[1].trim(), body: (sentence[2] ?? "").trim() };
  }
  if (trimmed.length <= TITLE_MAX) return { title: trimmed, body: "" };
  const title = clipAtWord(trimmed, TITLE_MAX).preview;
  return { title, body: trimmed.slice(title.length).trim() };
}

export function visibleCardText(label: string): {
  title: string;
  body: string;
  truncated: boolean;
} {
  const { title, body } = splitLabel(label);
  if (!body) {
    const clipped = clipAtWord(title, TITLE_MAX + BODY_VISIBLE_MAX);
    return { title: clipped.preview, body: "", truncated: clipped.truncated };
  }
  const clipped = clipAtWord(body, BODY_VISIBLE_MAX);
  return { title, body: clipped.preview, truncated: clipped.truncated };
}

export function visibleDecisionText(label: string): { preview: string; truncated: boolean } {
  return clipAtWord(label.replace(/\s+/g, " ").trim(), 72);
}
