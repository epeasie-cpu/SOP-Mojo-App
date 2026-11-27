import { QmsFrame } from "@/components/QmsFrame";
import { CPT_KIT_EMAIL_LEAD } from "@/lib/cpt-kit";
import { CPT_KIT_BUILDER_PRO_GO, CPT_KIT_DISCLAIMER, CPT_KIT_UPSELL } from "@/lib/cpt-kit-page";
import { QMS_SPAM } from "@/lib/qms-check";
import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Your 2027 SLP CPT Code Transition Kit is on its way | SOP Mojo");

export default function CptKitReadyPage() {
  return (
    <QmsFrame>
      <div className="mx-auto w-full max-w-lg px-4 py-8">
        <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
          <p className="text-xs font-semibold tracking-[0.18em] text-[#C1FF72] uppercase">SOP Mojo</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance text-zinc-50" role="status">
            {CPT_KIT_EMAIL_LEAD}
          </h1>
          <p className="mt-4 text-base leading-7 text-zinc-200">We emailed the kit. The link is in that message, not on this page.</p>
          <p className="mt-4 text-base text-zinc-200">{QMS_SPAM}</p>
          <p className="mt-4 text-sm text-zinc-400">{CPT_KIT_DISCLAIMER}</p>
          <aside className="mt-8 rounded-lg border border-[#C1FF72] bg-zinc-900 p-4">
            <p className="text-lg font-semibold leading-7 text-zinc-50">{CPT_KIT_UPSELL}</p>
            <a
              href={CPT_KIT_BUILDER_PRO_GO}
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
