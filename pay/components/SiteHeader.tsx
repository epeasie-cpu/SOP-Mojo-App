"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import { headerLogoHref, hidesAccountHeaderLink } from "@/lib/lead-pages";

export function SiteHeader() {
  const pathname = usePathname();
  const search = useSearchParams();
  if (pathname.startsWith("/checkout") && search.get("embed") === "1") return null;
  if (pathname.startsWith("/admin")) return null;
  const showAccount = !hidesAccountHeaderLink(pathname);
  const logoHref = headerLogoHref(pathname);
  const logo = <Logo />;
  const logoClass = "inline-flex min-h-12 shrink-0 items-center";
  return (
    <header className="border-b border-zinc-800">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
        {logoHref.startsWith("http") ? (
          <a href={logoHref} className={logoClass}>
            {logo}
          </a>
        ) : (
          <Link href={logoHref} className={logoClass}>
            {logo}
          </Link>
        )}
        {showAccount ? (
          <Link href="/account" className="inline-flex min-h-12 items-center text-sm text-zinc-400">
            Update card
          </Link>
        ) : null}
      </div>
    </header>
  );
}
