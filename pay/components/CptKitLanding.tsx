import { requestCptKit } from "@/app/2027-slp-cpt-kit/actions";
import { QmsFrame } from "@/components/QmsFrame";
import {
  CPT_KIT_BUILDER_PRO_GO,
  CPT_KIT_DISCLAIMER,
  CPT_KIT_FAQ,
  CPT_KIT_PARTS,
  CPT_KIT_SEO_H1,
  CPT_KIT_UPSELL,
  cptKitFaqJsonLd,
} from "@/lib/cpt-kit-page";

const buttonClass =
  "inline-flex min-h-14 items-center justify-center rounded-sm bg-[#C1FF72] px-4 text-center text-base font-semibold text-[#0C0E0C]";

export function CptKitLanding({ error }: { error: string | null }) {
  return (
    <QmsFrame>
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(cptKitFaqJsonLd()) }} />
        <p className="text-xs font-semibold tracking-[0.18em] text-[#C1FF72] uppercase">SOP Mojo</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance text-zinc-50 sm:text-4xl">{CPT_KIT_SEO_H1}</h1>
        <p className="mt-3 max-w-2xl text-lg leading-7 text-zinc-300">
          CPT 92507 is deleted after 12/31/2026. On 1/1/2027 it is replaced by new timed base and add-on code pairs.
        </p>
        <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-300">
          Free for small pediatric speech, OT, and PT practices. The kit is a one-page job aid plus a minutes-to-units calculator. You enter your own payer rates. We email the link. It is not on this page.
        </p>
        <p className="mt-3 text-sm text-zinc-400">{CPT_KIT_DISCLAIMER}</p>
        <form action={requestCptKit} className="mt-6 grid max-w-lg gap-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
          <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
            <label htmlFor="cpt-company">Company</label>
            <input id="cpt-company" name="company" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-zinc-200" htmlFor="cpt-name">
              Name
            </label>
            <input id="cpt-name" name="name" type="text" required autoComplete="name" className="min-h-14 rounded-sm border border-zinc-700 bg-zinc-900 px-3 text-base" />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-zinc-200" htmlFor="cpt-email">
              Email
            </label>
            <input id="cpt-email" name="email" type="email" required autoComplete="email" className="min-h-14 rounded-sm border border-zinc-700 bg-zinc-900 px-3 text-base" />
          </div>
          {error ? (
            <p className="text-sm text-red-300" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className={buttonClass}>
            Email me the kit
          </button>
        </form>
        <article className="mt-12 grid gap-10 text-base leading-7 text-zinc-300">
          <section>
            <h2 className="text-2xl font-semibold text-zinc-50">What&apos;s inside</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              {CPT_KIT_PARTS.map((part) => (
                <li key={part.title}>
                  <span className="font-semibold text-zinc-100">{part.title}.</span> {part.detail}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-2xl font-semibold text-zinc-50">Questions</h2>
            <div className="mt-4 grid gap-6">
              {CPT_KIT_FAQ.map((item) => (
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
              {CPT_KIT_UPSELL}{" "}
              <a className="text-[#C1FF72] underline" href={CPT_KIT_BUILDER_PRO_GO}>
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
