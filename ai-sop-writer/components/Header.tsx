import Link from "next/link";
import { WRITER_UPGRADE_URL, hostLabel } from "@/lib/site";
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
    <header className="no-print border-b border-zinc-800 bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0" aria-label="AI SOP Writer home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-4 text-sm text-zinc-400 lg:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-lime">
              {item.label}
            </Link>
          ))}
          <span className="hidden text-xs tracking-[0.16em] text-zinc-600 uppercase xl:inline">
            {hostLabel()}
          </span>
          <a
            href={WRITER_UPGRADE_URL}
            className="rounded-sm bg-lime px-3 py-1.5 font-semibold text-lime-ink hover:bg-lime/90"
          >
            Get Builder Pro
          </a>
        </nav>
        <details className="relative lg:hidden">
          <summary className="cursor-pointer list-none rounded-sm border border-zinc-700 px-3 py-1 text-sm text-zinc-300">
            Menu
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-56 rounded-md border border-zinc-700 bg-zinc-950 p-3 text-sm text-zinc-300 shadow-2xl">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-sm px-2 py-2 hover:bg-zinc-900 hover:text-lime"
              >
                {item.label}
              </Link>
            ))}
            <a
              href={WRITER_UPGRADE_URL}
              className="mt-2 block rounded-sm bg-lime px-2 py-2 text-center font-semibold text-lime-ink"
            >
              Get Builder Pro
            </a>
          </div>
        </details>
      </div>
    </header>
  );
}
