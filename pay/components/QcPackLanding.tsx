import { requestQcPack } from "@/app/quality-control-starter-pack/actions";
import { QmsFrame } from "@/components/QmsFrame";
import {
  QC_PACK_CHECK_URL,
  QC_PACK_FAQ,
  QC_PACK_FILES,
  QC_PACK_SEO_H1,
  qcPackFaqJsonLd,
} from "@/lib/qc-pack-page";
import { QMS_BUILDER_PRO_GO } from "@/lib/qms-page";

const buttonClass =
  "inline-flex min-h-14 items-center justify-center rounded-sm bg-[#C1FF72] px-4 text-center text-base font-semibold text-[#0C0E0C]";

export function QcPackLanding({ error }: { error: string | null }) {
  return (
    <QmsFrame>
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(qcPackFaqJsonLd()) }} />
        <p className="text-xs font-semibold tracking-[0.18em] text-[#C1FF72] uppercase">SOP Mojo</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-zinc-50">{QC_PACK_SEO_H1}</h1>
        <p className="mt-3 max-w-2xl text-lg leading-7 text-zinc-300">
          A free set of Google Docs and Sheets you copy. Enter your name and email and we send the link. It is not posted on this page.
        </p>
        <form action={requestQcPack} className="mt-6 grid max-w-lg gap-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
          <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
            <label htmlFor="qc-company">Company</label>
            <input id="qc-company" name="company" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-zinc-200" htmlFor="qc-name">
              Name
            </label>
            <input id="qc-name" name="name" type="text" required autoComplete="name" className="min-h-14 rounded-sm border border-zinc-700 bg-zinc-900 px-3 text-base" />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-zinc-200" htmlFor="qc-email">
              Email
            </label>
            <input id="qc-email" name="email" type="email" required autoComplete="email" className="min-h-14 rounded-sm border border-zinc-700 bg-zinc-900 px-3 text-base" />
          </div>
          {error ? (
            <p className="text-sm text-red-300" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className={buttonClass}>
            Email me the pack
          </button>
          <a href={QC_PACK_CHECK_URL} className="text-center text-sm text-[#C1FF72] underline">
            Or take the 2-minute QMS check
          </a>
        </form>
        <article className="mt-12 grid gap-10 text-base leading-7 text-zinc-300">
          <section>
            <h2 className="text-2xl font-semibold text-zinc-50">What&apos;s inside</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              {QC_PACK_FILES.map((file) => (
                <li key={file.id}>
                  <span className="font-semibold text-zinc-100">
                    {file.id} {file.title}.
                  </span>{" "}
                  {file.detail}
                </li>
              ))}
            </ul>
            <p className="mt-3">All of them are Google Docs or Sheets you copy.</p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold text-zinc-50">Questions</h2>
            <div className="mt-4 grid gap-6">
              {QC_PACK_FAQ.map((item) => (
                <div key={item.question}>
                  <h3 className="text-lg font-semibold text-zinc-50">{item.question}</h3>
                  <p className="mt-2">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2 className="text-2xl font-semibold text-zinc-50">Keep going</h2>
            <p className="mt-3">
              <a className="text-[#C1FF72] underline" href={QC_PACK_CHECK_URL}>
                Take the 2-minute QMS check
              </a>
              . Builder Pro, for writing the SOPs, is $39/mo at{" "}
              <a className="text-[#C1FF72] underline" href={QMS_BUILDER_PRO_GO}>
                pay.sopmojo.com/go/builder_pro
              </a>
              .
            </p>
          </section>
        </article>
      </div>
    </QmsFrame>
  );
}
