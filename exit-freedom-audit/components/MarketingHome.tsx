import Link from "next/link";
import { HOME_SECTIONS } from "@/lib/content";
import { AUDIENCE, SITE } from "@/lib/site";
import { StartQuizButton } from "./StartQuizButton";

const CARDS = [
  {
    title: "Coverage",
    body: "If a key person is out sick and the work waits, that is a missing handoff. It is not a character flaw.",
  },
  {
    title: "A buyer",
    body: "They can only underwrite what they can see. Stories in your head become a diligence discount.",
  },
  {
    title: "New help",
    body: "AI needs documentation as the source of truth. Without an SOP or a map, automation means teaching the work again.",
  },
];

export function MarketingHome() {
  const [audit, exit, scale, ai] = HOME_SECTIONS;
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
      <p className="text-sm font-semibold text-mojo-ink">Ops Audit</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl">
        Ops Scalability Score
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600">
        A free {audit.heading.toLowerCase()} for {AUDIENCE}. {SITE.parentName} scores whether the
        work can run when the person who owns it steps out — time off, a sale, or a calmer week.
      </p>
      <StartQuizButton />
      <p className="mt-3 text-sm text-zinc-500">About 3 minutes · 11 questions · answer from memory</p>

      <section className="mt-12" aria-labelledby="audit-heading">
        <h2 id="audit-heading" className="text-xl font-bold tracking-tight">
          {audit.heading}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">{audit.body}</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {CARDS.map((item) => (
            <li key={item.title} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="exit-heading">
        <h2 id="exit-heading" className="text-xl font-bold tracking-tight">
          {exit.heading}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">{exit.body}</p>
      </section>

      <section className="mt-10" aria-labelledby="scale-heading">
        <h2 id="scale-heading" className="text-xl font-bold tracking-tight">
          {scale.heading}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">{scale.body}</p>
        <ol className="mt-4 space-y-3 rounded-2xl border border-zinc-200 bg-white p-5 text-sm leading-relaxed text-zinc-700 shadow-sm sm:p-6">
          <li>
            <span className="font-semibold text-zinc-950">1. Pick the freedom you want.</span> Exit,
            family time, a real stretch away, or less chaos in the week you already have.
          </li>
          <li>
            <span className="font-semibold text-zinc-950">2. Answer from memory.</span> About ten
            questions you can finish in seconds. No calling staff. No hunting through docs.
          </li>
          <li>
            <span className="font-semibold text-zinc-950">3. See the score and two gaps.</span> The
            two fixes come first, before any email.
          </li>
          <li>
            <span className="font-semibold text-zinc-950">4. Unlock the report.</span> Your email
            opens the six directional reads. Then request a call if you want help documenting the
            work.
          </li>
        </ol>
      </section>

      <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="ai-heading">
        <h2 id="ai-heading" className="text-xl font-bold tracking-tight">
          {ai.heading}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">{ai.body}</p>
        <p className="mt-4 text-sm leading-relaxed text-zinc-600">
          <Link href="/score" className="font-semibold text-zinc-950 underline decoration-zinc-300 underline-offset-2">
            What the score shows
          </Link>
          {" · "}
          <Link href="/faq" className="font-semibold text-zinc-950 underline decoration-zinc-300 underline-offset-2">
            FAQ
          </Link>
        </p>
      </section>
    </article>
  );
}
