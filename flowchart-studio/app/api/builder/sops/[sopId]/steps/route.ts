import { BUILDER_FLOWCHART_PATHS } from "@/lib/builder-bridge";
import { proxyBuilder } from "@/lib/builder-proxy";

export async function GET(
  request: Request,
  context: { params: Promise<{ sopId: string }> },
) {
  const { sopId } = await context.params;
  return proxyBuilder(request, BUILDER_FLOWCHART_PATHS.steps(sopId), "GET");
}
