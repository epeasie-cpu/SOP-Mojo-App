import Link from "next/link";
import { BUILDER_CTA_URL, SITE, WRITER_CTA_URL, hostLabel } from "@/lib/site";
import { indexedContent } from "@/lib/content";
import { Logo } from "./Logo";

const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/client-onboarding-checklist", label: "Checklist" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
];

export function MarketingHeader() {
  return (
    <header className="bg-black text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="shrink-0" aria-label="Client Systems home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-white/80 lg:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-lime">
              {item.label}
            </Link>
          ))}
          <a href={WRITER_CTA_URL} className="hover:text-lime">
            Writer
          </a>
          <a href={BUILDER_CTA_URL} className="hover:text-lime">
            Builder Pro
          </a>
          <Link href="/login" className="hover:text-lime">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-sm bg-lime px-3 py-1.5 font-semibold text-lime-ink hover:bg-lime/90"
          >
            Create workspace
          </Link>
        </nav>
        <details className="relative lg:hidden">
          <summary className="cursor-pointer list-none rounded-sm border border-white/20 px-3 py-1 text-sm">
            Menu
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-56 rounded-md border border-white/10 bg-forest p-3 text-sm shadow-lg">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-sm px-2 py-2 hover:bg-white/10"
              >
                {item.label}
              </Link>
            ))}
            <a href={WRITER_CTA_URL} className="block rounded-sm px-2 py-2 hover:bg-white/10">
              Writer
            </a>
            <a href={BUILDER_CTA_URL} className="block rounded-sm px-2 py-2 hover:bg-white/10">
              Builder Pro
            </a>
            <Link href="/login" className="block rounded-sm px-2 py-2 hover:bg-white/10">
              Log in
            </Link>
            <Link
              href="/signup"
              className="mt-2 block rounded-sm bg-lime px-2 py-2 text-center font-semibold text-lime-ink"
            >
              Create workspace
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  const pages = indexedContent().filter((entry) => entry.type !== "utility" || entry.path === "/sitemap");
  return (
    <footer className="mt-auto border-t border-line bg-forest text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-display text-xl font-semibold">Client Systems</p>
          <p className="mt-2 text-sm text-white/70">{SITE.tagline}</p>
          <p className="mt-4 text-sm text-white/70">
            A {SITE.parentName} product. Client onboarding systems for SMBs — not
            Notion, not ClickUp.
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
                  {entry.keyword}
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
                {hostLabel(SITE.parent)}
              </a>
            </li>
            <li>
              <a href={SITE.writer} className="hover:text-lime">
                AI SOP Writer
              </a>
            </li>
            <li>
              <a href={SITE.builder} className="hover:text-lime">
                SOP Builder Pro
              </a>
            </li>
            <li>
              <a href={SITE.library} className="hover:text-lime">
                SOP Library
              </a>
            </li>
            <li>
              <Link href="/sitemap" className="hover:text-lime">
                HTML sitemap
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© 2026 SOP Mojo. Client Systems on {hostLabel(SITE.host)}.</p>
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
