import Script from "next/script";
import { YouMayAlsoLike } from "@/components/YouMayAlsoLike";
import {
  BLUEPRINT_ABOUT,
  BLUEPRINT_BUY_LABEL,
  BLUEPRINT_COMPARE_AT,
  BLUEPRINT_FAQ,
  BLUEPRINT_FOR,
  BLUEPRINT_FULL_TITLE,
  BLUEPRINT_GERBER,
  BLUEPRINT_H1,
  BLUEPRINT_NOT_FOR,
  BLUEPRINT_PARTS,
  BLUEPRINT_PRICE_LABEL,
  BLUEPRINT_PROMISE,
  BLUEPRINT_SUPPORT,
  BLUEPRINT_SYSTEMS,
  BLUEPRINT_WARNING_SIGNS,
  blueprintCheckoutHref,
  blueprintFaqJsonLd,
  blueprintProductJsonLd,
} from "@/lib/blueprint-page";
import { NOT_AVAILABLE_YET } from "@/lib/library";
import { FOUNDER_TRAP_H1, FOUNDER_TRAP_PATH, FOUNDER_TRAP_PRICE_LABEL } from "@/lib/founder-trap-page";
import { OFFERS_FULL_TITLE, OFFERS_PATH, OFFERS_PRICE_LABEL } from "@/lib/offers-page";
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
      {BLUEPRINT_BUY_LABEL}
    </a>
  );
}

export function BlueprintLanding({ available }: { available: boolean }) {
  const href = blueprintCheckoutHref(available);
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-8 pb-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blueprintProductJsonLd(available)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blueprintFaqJsonLd()) }} />
      {href ? <Script src="https://pay.sopmojo.com/embed.js" strategy="afterInteractive" /> : null}

      <section>
        <p className="text-xs font-semibold tracking-[0.18em] text-lime uppercase">SOP Mojo</p>
        <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight text-balance text-zinc-50 sm:text-5xl">
          {BLUEPRINT_H1}
        </h1>
        <p className="mt-3 text-sm text-zinc-400">{BLUEPRINT_FULL_TITLE}</p>
        <p className="mt-4 max-w-2xl text-lg leading-7 text-zinc-300">{BLUEPRINT_PROMISE}</p>
        <p className="mt-5 flex items-baseline gap-3">
          <s className="text-lg text-zinc-500">{BLUEPRINT_COMPARE_AT}</s>
          <span className="text-4xl font-semibold text-lime">{BLUEPRINT_PRICE_LABEL}</span>
          <span className="text-sm text-zinc-400">one time</span>
        </p>
        <div className="mt-6">
          <Buy href={href} />
        </div>
      </section>

      <article className="mt-14 grid gap-12 text-base leading-7 text-zinc-300">
        <section>
          <h2 className="font-display text-2xl font-semibold text-zinc-50">The hidden ceiling</h2>
          <p className="mt-3">
            A lot of businesses reach $1M and stall. Revenue is real, and so is founder dependency: the company still waits on one person to sell, deliver, and decide. That is the hidden ceiling. The playbook names the warning signs before it asks you to write a single SOP.
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            {BLUEPRINT_WARNING_SIGNS.map((sign) => (
              <li key={sign}>{sign}</li>
            ))}
          </ul>
          <blockquote className="mt-4 border-l-2 border-lime pl-4 text-zinc-100">
            <p>{BLUEPRINT_GERBER}</p>
            <footer className="mt-2 text-sm text-zinc-400">Michael Gerber</footer>
          </blockquote>
          <p className="mt-4">
            It also points at Sam Carpenter&apos;s Work the System as a way to see the company as documented processes, not as a job you personally perform.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-zinc-50">What&apos;s inside</h2>
          <p className="mt-3">
            A 34-page PDF on how to build SOPs and a business operating system you can hand to someone else. These are the parts:
          </p>
          <ol className="mt-4 grid gap-4">
            {BLUEPRINT_PARTS.map((part) => (
              <li key={part.title} className="rounded-lg border border-zinc-800 p-4">
                <p className="font-semibold text-zinc-50">{part.title}</p>
                <p className="mt-1">{part.detail}</p>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-zinc-50">The 4-System Framework</h2>
          <p className="mt-3">
            Part 2 splits the company into four systems. The playbook uses these diagnostic questions so you can see where founder dependency actually sits.
          </p>
          <ul className="mt-4 grid gap-4">
            {BLUEPRINT_SYSTEMS.map((system) => (
              <li key={system.name} className="rounded-lg border border-zinc-800 p-4">
                <p className="font-semibold text-lime">{system.name}</p>
                <p className="mt-1">{system.question}</p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-zinc-50">Who it&apos;s for</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            {BLUEPRINT_FOR.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h3 className="font-display mt-6 text-xl font-semibold text-zinc-50">Who it&apos;s not for</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            {BLUEPRINT_NOT_FOR.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-zinc-50">About Ryan</h2>
          <p className="mt-3">{BLUEPRINT_ABOUT}</p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-zinc-50">{BLUEPRINT_SUPPORT}</h2>
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
            {BLUEPRINT_FAQ.map((item) => (
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
          { href: OFFERS_PATH, title: OFFERS_FULL_TITLE, detail: OFFERS_PRICE_LABEL },
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
