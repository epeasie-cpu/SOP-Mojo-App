import { escalateAllOverdueAccess } from "@/lib/automations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await escalateAllOverdueAccess();
  return Response.json({ ok: true, ...result });
}
