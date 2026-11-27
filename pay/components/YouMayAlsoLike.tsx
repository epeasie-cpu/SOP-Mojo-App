export function YouMayAlsoLike({
  items,
}: {
  items: { href: string; title: string; detail: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl font-semibold text-zinc-50">You may also like</h2>
      <ul className="mt-3 grid gap-3">
        {items.map((item) => (
          <li key={item.href}>
            <a href={item.href} className="flex min-h-14 items-center rounded-sm border border-zinc-700 px-4 text-zinc-100">
              <span>
                <span className="block font-semibold">{item.title}</span>
                <span className="block text-sm text-zinc-400">{item.detail}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
