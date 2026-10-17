import { AupShare } from "@/components/AupShare";
import { requestFreeAup } from "@/app/free/aup-generator/actions";
import { AUP_FREE_HEADLINE, AUP_FREE_UPSELL, BUILDER_PRO_GO } from "@/lib/aup-free";
import {
  AUP_FAQ,
  AUP_NOT_LEGAL_ADVICE,
  AUP_OUTLINE,
  AUP_SEO_H1,
  AUP_STEPS,
  aupCanonicalUrl,
  aupFaqJsonLd,
  aupSoftwareJsonLd,
} from "@/lib/aup-landing";

export function AupLanding({ error, returnPath }: { error: string | null; returnPath: string }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aupSoftwareJsonLd()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aupFaqJsonLd()) }} />
      <p className="text-xs font-semibold tracking-[0.18em] text-lime uppercase">SOP Mojo</p>
      <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight text-zinc-50">{AUP_SEO_H1}</h1>
      <p className="mt-3 max-w-2xl text-lg leading-7 text-zinc-300">
        Write an acceptable use policy template for your team. Enter your email and we send the access link to this free tool.
      </p>
      <form action={requestFreeAup} className="mt-6 grid max-w-lg gap-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
        <input type="hidden" name="return" value={returnPath} />
        <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
          <label htmlFor="company">Company</label>
          <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
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
        <div className="grid gap-2">
          <label className="text-sm font-medium text-zinc-200" htmlFor="firstName">
            First name <span className="font-normal text-zinc-500">(optional)</span>
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            className="min-h-14 rounded-sm border border-zinc-700 bg-zinc-900 px-3 text-base"
          />
        </div>
        {error ? (
          <p className="text-sm text-red-300" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="min-h-14 rounded-sm bg-lime font-semibold text-lime-ink">
          {AUP_FREE_HEADLINE}
        </button>
      </form>

      <article className="mt-12 grid gap-10 text-base leading-7 text-zinc-300">
        <section>
          <h2 className="font-display text-2xl font-semibold text-zinc-50">What an acceptable use policy is</h2>
          <p className="mt-3">
            An acceptable use policy, often called an AUP, tells people how they may use company devices, accounts, and data. It is a written set of expectations. An employee acceptable use policy is the version you ask staff to read. It does not, by itself, make a rule enforceable.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl font-semibold text-zinc-50">Who needs an AUP</h2>
          <p className="mt-3">An AUP for a small business is useful when more than one person can reach company email, files, or devices.</p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Small businesses that issue email, laptops, or shared files.</li>
            <li>MSP clients who want a written policy their IT provider can point to.</li>
            <li>Remote teams that use home networks, personal phones, and company accounts.</li>
          </ul>
        </section>
        <section>
          <h2 className="font-display text-2xl font-semibold text-zinc-50">What an acceptable use policy covers</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Devices: company computers, phones, and accounts.</li>
            <li>Email: company mail and forwarding.</li>
            <li>Internet: browsing on the company network.</li>
            <li>Data: customer and company information, and where it may be stored.</li>
            <li>Social media: posts about the business and use of company accounts.</li>
            <li>BYOD: personal phones and laptops used for work.</li>
            <li>Consequences: what the business may do if someone ignores the policy, such as removing access.</li>
          </ul>
        </section>
        <section>
          <h2 className="font-display text-2xl font-semibold text-zinc-50">A sample acceptable use policy outline</h2>
          <p className="mt-3">
            This is a generic outline you can read before you use the tool. It is not an IT acceptable use policy example you should publish as-is, and it is not a finished policy.
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            {AUP_OUTLINE.map((item) => (
              <li key={item.title}>
                <span className="font-semibold text-zinc-100">{item.title}.</span> {item.detail}
              </li>
            ))}
          </ol>
          <p className="mt-4 rounded-sm border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-200">{AUP_NOT_LEGAL_ADVICE}</p>
        </section>
        <section>
          <h2 className="font-display text-2xl font-semibold text-zinc-50">How the free generator works</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            {AUP_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
        <section>
          <h2 className="font-display text-2xl font-semibold text-zinc-50">Questions</h2>
          <div className="mt-4 grid gap-6">
            {AUP_FAQ.map((item) => (
              <div key={item.question}>
                <h3 className="text-lg font-semibold text-zinc-50">{item.question}</h3>
                <p className="mt-2">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
        <aside className="rounded-lg border border-lime bg-zinc-900 p-4">
          <h2 className="text-lg font-semibold leading-7 text-zinc-50">{AUP_FREE_UPSELL}</h2>
          <a
            href={BUILDER_PRO_GO}
            className="mt-4 inline-flex min-h-14 w-full items-center justify-center rounded-sm bg-lime px-4 text-center text-base font-semibold text-lime-ink"
          >
            Get Builder Pro
          </a>
        </aside>
      </article>
      <AupShare url={aupCanonicalUrl()} />
    </div>
  );
}
