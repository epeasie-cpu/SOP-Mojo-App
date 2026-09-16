import Link from "next/link";
import { Logo } from "./Logo";

const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/ai-sop-generator", label: "Generator" },
  { href: "/sop-template", label: "Template" },
  { href: "/use-cases", label: "Use cases" },
  { href: "/faq", label: "FAQ" },
];

export function Header() {
  return (
    <header className="no-print bg-black text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="shrink-0" aria-label="AI SOP Writer home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-white/80 lg:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-lime">
              {item.label}
            </Link>
          ))}
          <a
            href="https://builder.sopmojo.com"
            className="rounded-sm bg-lime px-3 py-1.5 font-semibold text-lime-ink hover:bg-lime/90"
          >
            SOP Builder Pro
          </a>
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
            <a
              href="https://builder.sopmojo.com"
              className="mt-2 block rounded-sm bg-lime px-2 py-2 text-center font-semibold text-lime-ink"
            >
              SOP Builder Pro
            </a>
          </div>
        </details>
      </div>
    </header>
  );
}
