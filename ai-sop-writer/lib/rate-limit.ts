const buckets = new Map<string, number[]>();

/** Basic in-memory limiter. Serverless instances do not share the bucket. */
export function consumeRateLimit(
  key: string,
  now = Date.now(),
  limit = 5,
  windowMs = 10 * 60 * 1000,
): boolean {
  const recent = (buckets.get(key) ?? []).filter((stamp) => now - stamp < windowMs);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    return false;
  }
  recent.push(now);
  buckets.set(key, recent);
  return true;
}

export function resetRateLimits(): void {
  buckets.clear();
}

export function requestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const raw = forwarded?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "unknown";
  const ip = raw.trim().slice(0, 80);
  return ip || "unknown";
}
