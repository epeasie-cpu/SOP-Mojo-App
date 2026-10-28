import { QmsFrame } from "@/components/QmsFrame";
import { QC_PACK_EMAIL_LEAD } from "@/lib/qc-pack";
import { QC_PACK_CHECK_URL } from "@/lib/qc-pack-page";
import { QMS_SPAM, QMS_UPSELL } from "@/lib/qms-check";
import { QMS_BUILDER_PRO_GO } from "@/lib/qms-page";
import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Your Quality Control Starter Pack is on its way | SOP Mojo");

export default function QcPackReadyPage() {
  return (
    <QmsFrame>
      <div className="mx-auto w-full max-w-lg px-4 py-8">
        <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
          <p className="text-xs font-semibold tracking-[0.18em] text-[#C1FF72] uppercase">SOP Mojo</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50" role="status">
            {QC_PACK_EMAIL_LEAD}
          </h1>
          <p className="mt-4 text-base leading-7 text-zinc-200">We emailed the pack. The link is in that message, not on this page.</p>
          <p className="mt-4 text-base text-zinc-200">{QMS_SPAM}</p>
          <p className="mt-6">
            <a className="text-[#C1FF72] underline" href={QC_PACK_CHECK_URL}>
              Or take the 2-minute QMS check
            </a>
          </p>
          <aside className="mt-8 rounded-lg border border-[#C1FF72] bg-zinc-900 p-4">
            <p className="text-lg font-semibold leading-7 text-zinc-50">{QMS_UPSELL}</p>
            <a
              href={QMS_BUILDER_PRO_GO}
              className="mt-4 inline-flex min-h-14 w-full items-center justify-center rounded-sm bg-[#C1FF72] px-4 text-center text-base font-semibold text-[#0C0E0C]"
            >
              Get Builder Pro — $39/mo
            </a>
          </aside>
        </article>
      </div>
    </QmsFrame>
  );
}
