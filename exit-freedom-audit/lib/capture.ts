import { isEmail, normalizeEmail } from "./email";
import { auditTagsForGoal, mailchimpSettings, tagAudienceMember, type CaptureResult } from "./mailchimp";
import { isGoal, type Goal } from "./questions";

export type CaptureResponse = {
  ok: boolean;
  unlocked?: boolean;
  error?: string;
  mailchimp?: CaptureResult;
};

export function parseCaptureBody(body: unknown): { email: string; goal: Goal } | { error: string } {
  if (!body || typeof body !== "object") return { error: "Enter a valid email." };
  const record = body as Record<string, unknown>;
  const email = normalizeEmail(record.email);
  if (!isEmail(email)) return { error: "Enter a valid email." };
  if (!isGoal(record.goal)) return { error: "Pick a goal in the quiz before unlocking." };
  return { email, goal: record.goal };
}

export async function captureAuditEmail(input: {
  email: string;
  goal: Goal;
  env: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<CaptureResult> {
  const settings = mailchimpSettings(input.env);
  const tags = auditTagsForGoal(input.goal);
  if (!settings) return { ok: true, skipped: true, reason: "unconfigured", tags };
  try {
    return await tagAudienceMember({
      email: input.email,
      tags,
      settings,
      fetchImpl: input.fetchImpl,
    });
  } catch {
    return { ok: false, reason: "error", tags };
  }
}

/**
 * A valid email unlocks even when Mailchimp is unset or rejects the call.
 * Invalid email or goal does not unlock.
 */
export async function handleCapture(input: {
  body: unknown;
  env: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<{ status: number; body: CaptureResponse }> {
  const parsed = parseCaptureBody(input.body);
  if ("error" in parsed) return { status: 400, body: { ok: false, error: parsed.error } };
  let mailchimp: CaptureResult;
  try {
    mailchimp = await captureAuditEmail({
      email: parsed.email,
      goal: parsed.goal,
      env: input.env,
      fetchImpl: input.fetchImpl,
    });
  } catch {
    mailchimp = { ok: false, reason: "error", tags: auditTagsForGoal(parsed.goal) };
  }
  if (!mailchimp.ok && !mailchimp.skipped) {
    console.error("audit capture mailchimp failed", mailchimp.reason);
  }
  return { status: 200, body: { ok: true, unlocked: true, mailchimp } };
}
