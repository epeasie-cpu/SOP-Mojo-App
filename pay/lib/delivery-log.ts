/** Domain only. The local part of an address never goes into a log line. */
export function emailDomain(email: string): string {
  const domain = email.trim().toLowerCase().split("@").pop() ?? "";
  const cleaned = domain.replace(/[^a-z0-9.-]/g, "");
  return cleaned || "unknown";
}

function safeMessageId(id: string): string {
  const trimmed = id.trim();
  if (!trimmed || trimmed.includes("@") || trimmed.length > 80) return "missing";
  return trimmed;
}

export function logMailchimpFailure(input: {
  source: string;
  step: "member" | "tag" | "network";
  status?: number;
  email: string;
}): void {
  console.error(
    JSON.stringify({
      source: input.source,
      provider: "mailchimp",
      step: input.step,
      ok: false,
      ...(typeof input.status === "number" ? { status: input.status } : {}),
      domain: emailDomain(input.email),
    }),
  );
}

export function logResendSent(input: { source: string; id: string; email: string }): void {
  console.info(
    JSON.stringify({
      source: input.source,
      provider: "resend",
      ok: true,
      id: safeMessageId(input.id),
      domain: emailDomain(input.email),
    }),
  );
}
