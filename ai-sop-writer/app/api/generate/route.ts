import { generateSop } from "@/lib/llm";
import { validateInput } from "@/lib/template-engine";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = validateInput(body);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  const result = await generateSop(parsed.input);
  return Response.json(result);
}
