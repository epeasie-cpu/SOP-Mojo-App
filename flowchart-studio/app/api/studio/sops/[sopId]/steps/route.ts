import { BUILDER_STUDIO_PATHS } from "@/lib/builder-bridge";
import { proxyStudio } from "@/lib/studio-gate";

export async function GET(request: Request, context: { params: Promise<{ sopId: string }> }) {
  const { sopId } = await context.params;
  if (!sopId || sopId.includes("/") || sopId.includes("\\") || sopId.includes("..")) {
    return Response.json({ error: "Unknown SOP." }, { status: 400 });
  }
  return proxyStudio(request, BUILDER_STUDIO_PATHS.steps(sopId));
}
