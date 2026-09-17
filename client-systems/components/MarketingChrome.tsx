import Link from "next/link";
import { BUILDER_CTA_URL, SITE, WRITER_CTA_URL } from "@/lib/site";
import { Logo } from "./Logo";

export function MarketingHeader() {
  return (
    <header className="bg-black text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="shrink-0" aria-label="Client Systems home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-white/80 sm:flex">
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
        <Link
          href="/login"
          className="rounded-sm border border-white/20 px-3 py-1 text-sm sm:hidden"
        >
          Log in
        </Link>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-forest text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-white/70 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          A {SITE.parentName} product. Canonical host{" "}
          <span className="text-white">clients.sopmojo.com</span>.
        </p>
        <p className="flex flex-wrap gap-3">
          <a className="hover:text-lime" href={SITE.parent}>
            sopmojo.com
          </a>
          <a className="hover:text-lime" href={SITE.writer}>
            Writer
          </a>
          <a className="hover:text-lime" href={SITE.builder}>
            Builder Pro
          </a>
          <a className="hover:text-lime" href={`mailto:${SITE.founderEmail}`}>
            {SITE.founderEmail}
          </a>
        </p>
      </div>
    </footer>
  );
}
