import Link from "next/link";
import { indexedContent } from "@/lib/content";
import { SITE } from "@/lib/site";

export function Footer() {
  const pages = indexedContent().filter((entry) => entry.type !== "use-case");
  const useCases = indexedContent().filter((entry) => entry.type === "use-case");
  return (
    <footer className="no-print mt-auto border-t border-line bg-forest text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-1">
          <p className="font-display text-xl font-semibold">AI SOP Writer</p>
          <p className="mt-2 text-sm text-white/70">{SITE.tagline}</p>
          <p className="mt-4 text-sm text-white/70">
            A {SITE.parentName} product. SOP means standard operating procedure.
          </p>
          <p className="mt-4 text-sm">
            <a className="text-lime underline-offset-2 hover:underline" href={`mailto:${SITE.founderEmail}`}>
              {SITE.founderEmail}
            </a>
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-lime uppercase">Product</p>
          <ul className="mt-3 space-y-2 text-sm text-white/80">
            {pages.map((entry) => (
              <li key={entry.path}>
                <Link href={entry.path} className="hover:text-lime">
                  {entry.heading}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-lime uppercase">Use cases</p>
          <ul className="mt-3 space-y-2 text-sm text-white/80">
            {useCases.map((entry) => (
              <li key={entry.path}>
                <Link href={entry.path} className="hover:text-lime">
                  {entry.heading}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-lime uppercase">SOP Mojo</p>
          <ul className="mt-3 space-y-2 text-sm text-white/80">
            <li>
              <a href={SITE.parent} className="hover:text-lime">
                sopmojo.com
              </a>
            </li>
            <li>
              <a href={SITE.library} className="hover:text-lime">
                SOP Library
              </a>
            </li>
            <li>
              <a href={SITE.builder} className="hover:text-lime">
                SOP Builder Pro
              </a>
            </li>
            <li>
              <Link href="/sitemap" className="hover:text-lime">
                HTML sitemap
              </Link>
            </li>
            <li>
              <Link href="/vs/sop-builder-pro" className="hover:text-lime">
                Writer vs Builder Pro
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© 2026 SOP Mojo. AI SOP Writer on writer.sopmojo.com.</p>
          <p>
            <Link href="/sitemap" className="hover:text-lime">
              Sitemap
            </Link>
            {" · "}
            <a href="/sitemap.xml" className="hover:text-lime">
              XML
            </a>
            {" · "}
            <a href="/content-tree.xml" className="hover:text-lime">
              Content tree
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
