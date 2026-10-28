import { LEAD_POPUP_OFFERS, LEAD_POPUP_SNIPPET } from "@/lib/lead-popup";
import { privateMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = privateMetadata("Lead popup demo | SOP Mojo");

export default async function LeadPopupDemoPage({
  searchParams,
}: {
  searchParams: Promise<{ offer?: string }>;
}) {
  const query = await searchParams;
  const requested = query.offer?.trim() ?? "";
  const offer = requested in LEAD_POPUP_OFFERS ? requested : "qc-pack";
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold text-zinc-50">Lead popup demo</h1>
      <p className="mt-2 text-sm text-zinc-400">Loaded offer: {offer}</p>
      <p className="mt-3 max-w-xl text-base leading-7 text-zinc-300">
        This page loads the popup for every path. Scroll halfway down, or on a desktop move the pointer out through the top of the window. Add ?force=1 to open it immediately.
      </p>
      <pre className="mt-6 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-200">
        <code>{LEAD_POPUP_SNIPPET}</code>
      </pre>
      <div className="h-[140vh]" />
      <script src="/embed/lead-popup.js" data-offer={offer} data-paths="*" defer />
    </div>
  );
}
