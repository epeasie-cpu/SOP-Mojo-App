import { requestFreeFounderTrap } from "@/app/escape-the-founder-trap/actions";
import { YouMayAlsoLike } from "@/components/YouMayAlsoLike";
import { BLUEPRINT_H1, BLUEPRINT_PATH, BLUEPRINT_PRICE_LABEL } from "@/lib/blueprint-page";
import { FOUNDER_TRAP_COMING_SOON, FOUNDER_TRAP_SUBMIT } from "@/lib/founder-trap";
import {
  FOUNDER_TRAP_FAQ,
  FOUNDER_TRAP_FOR,
  FOUNDER_TRAP_H1,
  FOUNDER_TRAP_NOT_FOR,
  FOUNDER_TRAP_PROMISE,
  FOUNDER_TRAP_SECTIONS,
  FOUNDER_TRAP_SUPPORT,
  founderTrapFaqJsonLd,
  founderTrapProductJsonLd,
} from "@/lib/founder-trap-page";
import { OFFERS_FULL_TITLE, OFFERS_PATH, OFFERS_PRICE_LABEL } from "@/lib/offers-page";
import { SITE } from "@/lib/site";

export function FounderTrapLanding({ available, error }: { available: boolean; error: string | null }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(founderTrapProductJsonLd(available)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(founderTrapFaqJsonLd()) }} />
      <p className="text-xs font-semibold tracking-[0.18em] text-lime uppercase">SOP Mojo</p>
      <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight text-balance text-zinc-50 sm:text-5xl">
        {FOUNDER_TRAP_H1}
      </h1>
      <p className="mt-3 text-sm text-zinc-400">A free 15-page PDF.</p>
      <p className="mt-4 max-w-2xl text-lg leading-7 text-zinc-300">{FOUNDER_TRAP_PROMISE}</p>

      {available ? (
        <form action={requestFreeFounderTrap} className="mt-6 grid max-w-lg gap-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
          <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
            <label htmlFor="company">Company</label>
            <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-zinc-200" htmlFor="name">
              Name <span className="font-normal text-zinc-500">(optional)</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              className="min-h-14 rounded-sm border border-zinc-700 bg-zinc-900 px-3 text-base"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-zinc-200" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="min-h-14 rounded-sm border border-zinc-700 bg-zinc-900 px-3 text-base"
            />
          </div>
          {error ? (
            <p className="text-sm text-red-300" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="min-h-14 rounded-sm bg-lime font-semibold text-lime-ink">
            {FOUNDER_TRAP_SUBMIT}
          </button>
        </form>
      ) : (
        <p className="mt-6 inline-flex min-h-14 items-center text-base font-semibold text-zinc-300" role="status">
          {FOUNDER_TRAP_COMING_SOON}
        </p>
      )}

      <article className="mt-14 grid gap-12 text-base leading-7 text-zinc-300">
        {FOUNDER_TRAP_SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="font-display text-2xl font-semibold text-zinc-50">{section.title}</h2>
            <p className="mt-3">{section.detail}</p>
          </section>
        ))}

        <section>
          <h2 className="font-display text-2xl font-semibold text-zinc-50">Who it&apos;s for</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            {FOUNDER_TRAP_FOR.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h3 className="font-display mt-6 text-xl font-semibold text-zinc-50">Who it&apos;s not for</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            {FOUNDER_TRAP_NOT_FOR.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-zinc-50">{FOUNDER_TRAP_SUPPORT}</h2>
          <p className="mt-3">
            <a className="text-lime underline" href={`mailto:${SITE.founderEmail}`}>
              {SITE.founderEmail}
            </a>
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-zinc-50">Questions</h2>
          <div className="mt-4 grid gap-6">
            {FOUNDER_TRAP_FAQ.map((item) => (
              <div key={item.question}>
                <h3 className="font-semibold text-zinc-50">{item.question}</h3>
                <p className="mt-2">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </article>

      <YouMayAlsoLike
        items={[
          { href: BLUEPRINT_PATH, title: BLUEPRINT_H1, detail: BLUEPRINT_PRICE_LABEL },
          { href: OFFERS_PATH, title: OFFERS_FULL_TITLE, detail: OFFERS_PRICE_LABEL },
        ]}
      />
    </div>
  );
}
