import { BUILDER_FLOWCHART_PATHS } from "@/lib/builder-bridge";
import { proxyBuilder } from "@/lib/builder-proxy";

export async function GET(request: Request) {
  return proxyBuilder(request, BUILDER_FLOWCHART_PATHS.sops, "GET");
}
