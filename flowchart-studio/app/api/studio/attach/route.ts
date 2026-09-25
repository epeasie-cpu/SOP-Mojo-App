import { BUILDER_STUDIO_PATHS } from "@/lib/builder-bridge";
import { proxyStudio } from "@/lib/studio-gate";

export async function POST(request: Request) {
  return proxyStudio(request, BUILDER_STUDIO_PATHS.attach);
}