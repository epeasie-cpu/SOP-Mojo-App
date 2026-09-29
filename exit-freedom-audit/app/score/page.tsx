import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { MarketingShell } from "@/components/MarketingShell";
import { SCORE_METRICS, pageByPath } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

const page = pageByPath("/score");

export const metadata: Metadata = buildMetadata(page);

const BANDS = [
  { range: "0–39", name: "Fragile", detail: "Key-person dependent. Ordinary work waits on one person." },
  { range: "40–69", name: "Building", detail: "Not yet scalable. Some of the work is written; gaps remain." },
  { range: "70–100", name: "Ready", detail: "Core work can run without you in the room." },
];

export default function ScorePage() {
  return (
    <>
      <JsonLd page={page} />
      <MarketingShell title="Ops Scalability Score">
        <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
          <p className="text-sm font-semibold text-mojo-ink">Exit / Freedom Readiness</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl">
            Ops Scalability Score
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-zinc-600">
            This is the public teaser of the results. Your own numbers stay on your device. The
            score is a business operations audit of exit readiness, not a valuation.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-lg bg-zinc-950 px-5 text-base font-semibold text-white hover:bg-zinc-800"
          >
            Start the gut check →
          </Link>

          <section className="mt-12" aria-labelledby="bands-heading">
            <h2 id="bands-heading" className="text-xl font-bold tracking-tight">
              Exit readiness bands
            </h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              {BANDS.map((band) => (
                <div key={band.name} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <dt className="font-semibold">
                    {band.name}{" "}
                    <span className="font-normal text-zinc-500">{band.range}</span>
                  </dt>
                  <dd className="mt-2 text-sm leading-relaxed text-zinc-600">{band.detail}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-10" aria-labelledby="visible-heading">
            <h2 id="visible-heading" className="text-xl font-bold tracking-tight">
              Visible before email
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">
              The 0–100 ops scalability score, the band, and the two gaps to fix first. Headers for
              the deeper reads stay on screen so you can see what email opens. The values stay
              blurred until then.
            </p>
          </section>

          <section className="mt-10" aria-labelledby="reads-heading">
            <h2 id="reads-heading" className="text-xl font-bold tracking-tight">
              Six directional reads
            </h2>
            <ul className="mt-4 space-y-3">
              {SCORE_METRICS.map((metric) => (
                <li key={metric.title} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <h3 className="font-semibold">{metric.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">{metric.text}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="ai-heading">
            <h2 id="ai-heading" className="text-xl font-bold tracking-tight">
              AI readiness for SMBs
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">
              Automation follows documentation. The AI implementation readiness read is Not ready,
              Early, or Usable. It describes whether core work is written down consistently enough
              to hand to a tool. It is not a software recommendation.
            </p>
          </section>
        </article>
      </MarketingShell>
    </>
  );
}
