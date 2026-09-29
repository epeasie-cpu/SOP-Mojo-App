import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { MarketingShell } from "@/components/MarketingShell";
import { FAQS, pageByPath } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

const page = pageByPath("/faq");

export const metadata: Metadata = buildMetadata(page);

export default function FaqPage() {
  return (
    <>
      <JsonLd page={page} />
      <MarketingShell title="FAQ">
        <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
          <p className="text-sm font-semibold text-mojo-ink">SOP Mojo · audit.sopmojo.com</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl">
            Ops Scalability Score FAQ
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-zinc-600">
            Plain answers about the free exit readiness score for SMB CEOs and COOs.
          </p>
          <div className="mt-8 space-y-4">
            {FAQS.map((faq) => (
              <section key={faq.question} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold tracking-tight">{faq.question}</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{faq.answer}</p>
              </section>
            ))}
          </div>
          <p className="mt-8 text-sm text-zinc-600">
            <Link href="/" className="font-semibold text-zinc-950 underline decoration-zinc-300 underline-offset-2">
              Start the gut check
            </Link>
            {" · "}
            <Link href="/score" className="font-semibold text-zinc-950 underline decoration-zinc-300 underline-offset-2">
              What the score shows
            </Link>
          </p>
        </article>
      </MarketingShell>
    </>
  );
}
