import Script from "next/script";
import { YouMayAlsoLike } from "@/components/YouMayAlsoLike";
import { BLUEPRINT_H1, BLUEPRINT_PATH, BLUEPRINT_PRICE_LABEL } from "@/lib/blueprint-page";
import { FOUNDER_TRAP_H1, FOUNDER_TRAP_PATH, FOUNDER_TRAP_PRICE_LABEL } from "@/lib/founder-trap-page";
import { NOT_AVAILABLE_YET } from "@/lib/library";
import {
  OFFERS_ABOUT,
  OFFERS_BUY_LABEL,
  OFFERS_COMPARE_AT,
  OFFERS_EDITION,
  OFFERS_FAQ,
  OFFERS_FOR,
  OFFERS_FULL_TITLE,
  OFFERS_H1,
  OFFERS_NOT_FOR,
  OFFERS_NOT_IS,
  OFFERS_PARTS,
  OFFERS_PILLARS,
  OFFERS_PRICE_LABEL,
  OFFERS_PROMISE,
  OFFERS_SUPPORT,
  offersCheckoutHref,
  offersFaqJsonLd,
  offersProductJsonLd,
} from "@/lib/offers-page";
import { SITE } from "@/lib/site";

function Buy({ href, wide }: { href: string | null; wide?: boolean }) {
  const width = wide ? "w-full" : "";
  if (!href) {
    return (
      <p className={`inline-flex min-h-14 items-center text-base font-semibold text-zinc-300 ${width}`} role="status">
        {NOT_AVAILABLE_YET}
      </p>
    );
  }
  return (
    <a
      href={href}
      className={`inline-flex min-h-14 items-center justify-center rounded-sm bg-lime px-6 text-center text-base font-semibold text-lime-ink ${width}`}
    >
      {OFFERS_BUY_LABEL}
    </a>
  );
}

export function OffersLanding({ available }: { available: boolean }) {
  const href = offersCheckoutHref(available);
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-8 pb-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(offersProductJsonLd(available)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(offersFaqJsonLd()) }} />
      {href ? <Script src="https://pay.sopmojo.com/embed.js" strategy="afterInteractive" /> : null}

      <section>
        <p className="text-xs font-semibold tracking-[0.18em] text-lime uppercase">SOP Mojo</p>
        <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight text-balance text-zinc-50 sm:text-5xl">
          {OFFERS_H1}
        </h1>
        <p className="mt-3 text-sm text-zinc-400">
          {OFFERS_FULL_TITLE}. {OFFERS_EDITION}.
        </p>
        <p className="mt-4 max-w-2xl text-lg leading-7 text-zinc-300">{OFFERS_PROMISE}</p>
        <p className="mt-5 flex items-baseline gap-3">
          <s className="text-lg text-zinc-500">{OFFERS_COMPARE_AT}</s>
          <span className="text-4xl font-semibold text-lime">{OFFERS_PRICE_LABEL}</span>
          <span className="text-sm text-zinc-400">one time</span>
        </p>
        <div className="mt-6">
          <Buy href={href} />
        </div>
      </section>

      <article className="mt-14 grid gap-12 text-base leading-7 text-zinc-300">
        <section>
          <h2 className="font-display text-2xl font-semibold text-zinc-50">What an offer is not</h2>
          <p className="mt-3">
            A high converting offer is easier to explain than to decorate. The guide starts by separating a real offer from a discount or a feature list, then shows how to create an irresistible offer from that difference.
          </p>
          <ul className="mt-4 grid gap-4">
            {OFFERS_NOT_IS.map((item) => (
              <li key={item.label} className="rounded-lg border border-zinc-800 p-4">
                <p className="font-semibold text-zinc-50">{item.label}</p>
                <p className="mt-1">{item.detail}</p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-zinc-50">What&apos;s inside</h2>
          <p className="mt-3">A 31-page PDF by Ryan Pease. These are the chapters:</p>
          <ol className="mt-4 grid gap-4">
            {OFFERS_PARTS.map((part) => (
              <li key={part.title} className="rounded-lg border border-zinc-800 p-4">
                <p className="font-semibold text-zinc-50">{part.title}</p>
                <p className="mt-1">{part.detail}</p>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-zinc-50">The offer framework</h2>
          <p className="mt-3">The intro organizes the work into four pillars. Bonus stacking sits in the third.</p>
          <ul className="mt-4 grid gap-4">
            {OFFERS_PILLARS.map((pillar) => (
              <li key={pillar.name} className="rounded-lg border border-zinc-800 p-4">
                <p className="font-semibold text-lime">{pillar.name}</p>
                <p className="mt-1">{pillar.detail}</p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-zinc-50">Who it&apos;s for</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            {OFFERS_FOR.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h3 className="font-display mt-6 text-xl font-semibold text-zinc-50">Who it&apos;s not for</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            {OFFERS_NOT_FOR.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-zinc-50">About Ryan</h2>
          <p className="mt-3">{OFFERS_ABOUT}</p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-zinc-50">{OFFERS_SUPPORT}</h2>
          <p className="mt-3">
            <a className="text-lime underline" href={`mailto:${SITE.founderEmail}`}>
              {SITE.founderEmail}
            </a>
          </p>
          <p className="mt-3">
            <a className="text-zinc-300 underline" href="/legal/refunds">
              Read the refund policy
            </a>
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-zinc-50">Questions</h2>
          <div className="mt-4 grid gap-6">
            {OFFERS_FAQ.map((item) => (
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
          { href: FOUNDER_TRAP_PATH, title: FOUNDER_TRAP_H1, detail: FOUNDER_TRAP_PRICE_LABEL },
        ]}
      />

      <div className="mt-12">
        <Buy href={href} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950 p-3 md:hidden">
        <Buy href={href} wide />
      </div>
    </div>
  );
}
