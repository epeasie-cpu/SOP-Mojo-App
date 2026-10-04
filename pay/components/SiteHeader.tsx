"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";

export function SiteHeader() {
  const pathname = usePathname();
  const search = useSearchParams();
  if (pathname.startsWith("/checkout") && search.get("embed") === "1") return null;
  if (pathname.startsWith("/admin")) return null;
  return (
    <header className="border-b border-zinc-800">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="min-h-12 inline-flex items-center">
          <Logo />
        </Link>
        <Link href="/account" className="min-h-12 inline-flex items-center text-sm text-zinc-400">
          Update card
        </Link>
      </div>
    </header>
  );
}
