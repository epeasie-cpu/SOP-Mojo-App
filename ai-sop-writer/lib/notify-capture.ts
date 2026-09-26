import type { ClientSession } from "./session";

/** Tell the server to tag this account. Mailchimp failures must not block the unlocked action. */
export function notifyLeadCapture(session: ClientSession): void {
  const token = session.accessToken?.trim();
  if (!token || token.startsWith("dev:")) return;
  void fetch("/api/capture", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => undefined);
}
