import type { Metadata } from "next";
import Link from "next/link";
import { howToJsonLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";
import { PRICING, SITE } from "@/lib/site";

export const metadata: Metadata = buildMetadata({
  path: "/how-it-works",
  keyword: "AI process map from handwriting",
  description:
    "How Flowchart Studio turns a handwritten scribble, voice note, or pasted process into an editable AI flowchart — then a Builder Pro SOP import.",
});

export default function HowItWorksPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd()) }}
      />
      <p className="text-xs font-semibold tracking-[0.18em] text-lime uppercase">
        How it works
      </p>
      <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight">
        Handwriting to flowchart, then into Builder Pro
      </h1>
      <p className="mt-4 text-lg text-zinc-400">
        {SITE.name} is a low-friction AI process map. Capture once. Edit forever
        on the canvas — no all-or-nothing regen.
      </p>
      <ol className="mt-10 space-y-8">
        <li>
          <h2 className="font-display text-2xl font-semibold">1. Capture</h2>
          <p className="mt-2 text-zinc-400">
            Paste the process, talk with the browser Web Speech API, or upload a
            photo of a handwritten scribble. Vision runs on the server with your
            OpenAI or Anthropic key.
          </p>
        </li>
        <li>
          <h2 className="font-display text-2xl font-semibold">2. Edit the graph</h2>
          <p className="mt-2 text-zinc-400">
            Start, end, step, and decision nodes with labeled yes/no edges. Drag,
            rename, reconnect. The step list and canvas stay in sync.
          </p>
        </li>
        <li>
          <h2 className="font-display text-2xl font-semibold">3. Chat the deltas</h2>
          <p className="mt-2 text-zinc-400">
            Ask for a yes/no branch, delete a step, or rewrite labels. Chat
            returns the same graph JSON — not a disconnected draft.
          </p>
        </li>
        <li>
          <h2 className="font-display text-2xl font-semibold">4. Export with Builder Pro</h2>
          <p className="mt-2 text-zinc-400">
            Free is create + iterate. {PRICING.builderLabel}.{" "}
            {PRICING.unlockLabel} is a secondary path if you only need print and
            export.
          </p>
        </li>
      </ol>
      <p className="mt-10">
        <Link href="/" className="font-semibold text-lime hover:underline">
          Open the studio
        </Link>
      </p>
    </div>
  );
}
