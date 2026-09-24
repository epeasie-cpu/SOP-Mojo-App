import { BUILDER_FLOWCHART_PATHS } from "@/lib/builder-bridge";
import { proxyBuilder } from "@/lib/builder-proxy";

export async function POST(request: Request) {
  const body = await request.text();
  return proxyBuilder(request, BUILDER_FLOWCHART_PATHS.attach, "POST", body);
}
