export const LEAD_QA_EMAILS_ENV = "LEAD_QA_EMAILS";

/** Emails in LEAD_QA_EMAILS, lowercased. Empty entries are ignored. */
export function leadQaEmails(env: NodeJS.ProcessEnv): Set<string> {
  const raw = env[LEAD_QA_EMAILS_ENV] ?? "";
  return new Set(
    raw
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.includes("@")),
  );
}

/** True when this address may repeat a lead signup. It does not skip the rate limit. */
export function isLeadQaEmail(email: string, env: NodeJS.ProcessEnv): boolean {
  return leadQaEmails(env).has(email.trim().toLowerCase());
}
