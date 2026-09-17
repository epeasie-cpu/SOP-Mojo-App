export async function postSlackWebhook(
  url: string | null | undefined,
  text: string,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const webhook = url || process.env.WORKSPACE_SLACK_WEBHOOK;
  if (!webhook) return { ok: true, skipped: true };
  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      return { ok: false, error: `Slack webhook ${response.status}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Slack webhook failed" };
  }
}
