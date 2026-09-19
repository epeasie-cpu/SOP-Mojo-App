import Link from "next/link";
import { builderCheckoutUrl, hostLabel, SITE } from "@/lib/site";
import { Logo } from "./Logo";

export function Header() {
  return (
    <header className="no-print border-b border-zinc-800 bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0" aria-label="Flowchart Studio home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-4 text-sm text-zinc-400">
          <Link href="/how-it-works" className="hidden hover:text-lime sm:inline">
            How it works
          </Link>
          <a href={SITE.builder} className="hidden hover:text-lime md:inline">
            Builder Pro
          </a>
          <span className="hidden text-xs tracking-[0.16em] text-zinc-600 uppercase lg:inline">
            {hostLabel()}
          </span>
          <a
            href={builderCheckoutUrl()}
            className="rounded-sm bg-lime px-3 py-1.5 font-semibold text-lime-ink hover:bg-lime/90"
          >
            Builder Pro $47
          </a>
        </nav>
      </div>
    </header>
  );
}
