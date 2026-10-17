export function YouMayAlsoLike({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl font-semibold text-zinc-50">You may also like</h2>
      <a href={href} className="mt-3 flex min-h-14 items-center rounded-sm border border-zinc-700 px-4 text-zinc-100">
        <span>
          <span className="block font-semibold">{title}</span>
          <span className="block text-sm text-zinc-400">{detail}</span>
        </span>
      </a>
    </section>
  );
}
