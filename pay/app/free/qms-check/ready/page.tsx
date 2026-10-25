import { QmsFrame } from "@/components/QmsFrame";
import { QMS_BUILDER_PRO_GO } from "@/lib/qms-page";
import { QMS_EMAIL_LEAD, QMS_SPAM, QMS_UPSELL } from "@/lib/qms-check";
import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Your Quality System Fit Check is on its way | SOP Mojo");

export default function QmsReadyPage() {
  return (
    <QmsFrame>
      <div className="mx-auto w-full max-w-lg px-4 py-8">
        <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
          <p className="text-xs font-semibold tracking-[0.18em] text-[#C1FF72] uppercase">SOP Mojo</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50" role="status">
            {QMS_EMAIL_LEAD}
          </h1>
          <p className="mt-4 text-base leading-7 text-zinc-200">
            We emailed your category, score, gaps, and 30-day action plan. If the result is a compliance-grade QMS, documented SOPs are still the foundation.
          </p>
          <p className="mt-4 text-base text-zinc-200">{QMS_SPAM}</p>
          <aside className="mt-8 rounded-lg border border-[#C1FF72] bg-zinc-900 p-4">
            <p className="text-lg font-semibold leading-7 text-zinc-50">{QMS_UPSELL}</p>
            <a
              href={QMS_BUILDER_PRO_GO}
              className="mt-4 inline-flex min-h-14 w-full items-center justify-center rounded-sm bg-[#C1FF72] px-4 text-center text-base font-semibold text-[#0C0E0C]"
            >
              Get Builder Pro
            </a>
          </aside>
        </article>
      </div>
    </QmsFrame>
  );
}
