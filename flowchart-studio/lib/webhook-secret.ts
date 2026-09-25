import { createHash, timingSafeEqual } from "node:crypto";

export function webhookSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  const secret = env.ENTITLEMENT_WEBHOOK_SECRET?.trim() || env.MAKE_WEBHOOK_SECRET?.trim();
  return secret || null;
}

export function presentedWebhookSecret(request: Request): string | null {
  const header =
    request.headers.get("x-webhook-secret")?.trim() ||
    request.headers.get("x-make-secret")?.trim();
  if (header) return header;
  const auth = request.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(\S+)\s*$/i);
  return match?.[1] ?? null;
}

export function secretsMatch(presented: string, expected: string): boolean {
  const left = createHash("sha256").update(presented).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}
