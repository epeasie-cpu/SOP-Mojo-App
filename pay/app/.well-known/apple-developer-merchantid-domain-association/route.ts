import { readFileSync } from "node:fs";
import path from "node:path";

const body = readFileSync(
  path.join(process.cwd(), "well-known/apple-developer-merchantid-domain-association"),
);

export function GET() {
  return new Response(body, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "public, max-age=300",
    },
  });
}
