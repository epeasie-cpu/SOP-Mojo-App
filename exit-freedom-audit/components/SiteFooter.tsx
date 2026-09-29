import Link from "next/link";
import { AUDIENCE, SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="px-4 py-8 text-center text-xs leading-relaxed text-zinc-500">
      <nav aria-label="Site" className="mb-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
        <Link href="/" className="underline decoration-zinc-300 underline-offset-2">
          Ops Audit
        </Link>
        <Link href="/score" className="underline decoration-zinc-300 underline-offset-2">
          Ops Scalability Score
        </Link>
        <Link href="/faq" className="underline decoration-zinc-300 underline-offset-2">
          FAQ
        </Link>
      </nav>
      <p>
        {SITE.parentName} · free ops and exit readiness score for {AUDIENCE} ·{" "}
        {SITE.host.replace("https://", "")}
      </p>
      <p>Directional estimates from your answers, not a valuation.</p>
    </footer>
  );
}
