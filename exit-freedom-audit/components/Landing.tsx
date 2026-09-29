export function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
      <p className="text-sm font-semibold text-mojo-ink">Ops Scalability Score</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl">
        Exit / Freedom Readiness
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600">
        Time off, a sale, and a calmer week all wait on the same thing: whether the work can move
        when you are not in the room.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-8 inline-flex min-h-12 items-center justify-center rounded-lg bg-zinc-950 px-5 text-base font-semibold text-white hover:bg-zinc-800"
      >
        Start the gut check →
      </button>
      <p className="mt-3 text-sm text-zinc-500">About 3 minutes · 11 questions · answer from memory</p>

      <section className="mt-12">
        <h2 className="text-xl font-bold tracking-tight">A gut check, not a scare</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            {
              title: "Coverage",
              body: "If a key person is out sick and the work waits, that is a missing handoff. It is not a character flaw.",
            },
            {
              title: "A buyer",
              body: "They can only underwrite what they can see. Stories in your head become a diligence discount. This score will not invent a multiple.",
            },
            {
              title: "New help",
              body: "A new hire or an AI tool can only follow steps that are written. If the SOP is missing, both of them wait on you.",
            },
          ].map((item) => (
            <li key={item.title} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="font-semibold">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold tracking-tight">What you get</h2>
        <ol className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-700">
          <li>
            <span className="font-semibold text-zinc-950">1. Pick the freedom you want.</span> Exit,
            family time, a real stretch away, or less chaos in the week you already have.
          </li>
          <li>
            <span className="font-semibold text-zinc-950">2. Answer from memory.</span> About ten
            questions you can finish in seconds. No calling staff. No hunting through docs.
          </li>
          <li>
            <span className="font-semibold text-zinc-950">3. See the score and two gaps.</span> A
            0–100 headline and a plain band: Fragile, Building, or Ready. The two fixes come first,
            before any email.
          </li>
          <li>
            <span className="font-semibold text-zinc-950">4. Unlock the breakout.</span> Your email
            opens six directional reads — sellability, ops readiness, AI readiness, peer band,
            diligence risk, and how long work runs without you — plus a note you can send to Ops.
          </li>
        </ol>
      </section>
    </div>
  );
}
