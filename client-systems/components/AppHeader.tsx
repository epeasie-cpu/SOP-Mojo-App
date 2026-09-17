import Link from "next/link";
import { logoutAction } from "@/lib/actions/auth";
import { BUILDER_CTA_URL, SITE, WRITER_CTA_URL } from "@/lib/site";
import { Logo } from "./Logo";

export function AppHeader({
  email,
  workspaceName,
}: {
  email: string;
  workspaceName: string;
}) {
  return (
    <header className="bg-black text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/app" className="shrink-0" aria-label="Client Systems dashboard">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-4 text-sm text-white/80 lg:flex">
          <Link href="/app" className="hover:text-lime">
            Projects
          </Link>
          <Link href="/app/projects/new" className="hover:text-lime">
            New project
          </Link>
          <Link href="/app/settings" className="hover:text-lime">
            Settings
          </Link>
          <a href={WRITER_CTA_URL} className="hover:text-lime">
            Writer
          </a>
          <a href={SITE.library} className="hover:text-lime">
            Library
          </a>
          <a
            href={BUILDER_CTA_URL}
            className="rounded-sm bg-lime px-3 py-1.5 font-semibold text-lime-ink hover:bg-lime/90"
          >
            Builder Pro
          </a>
        </nav>
        <div className="flex items-center gap-3 text-xs text-white/70">
          <span className="hidden max-w-[14rem] truncate sm:inline">
            {workspaceName} · {email}
          </span>
          <form action={logoutAction}>
            <button className="rounded-sm border border-white/20 px-2 py-1 hover:border-lime hover:text-lime">
              Sign out
            </button>
          </form>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto border-t border-white/10 px-4 py-2 text-sm text-white/80 lg:hidden">
        <Link href="/app">Projects</Link>
        <Link href="/app/projects/new">New</Link>
        <Link href="/app/settings">Settings</Link>
        <a href={WRITER_CTA_URL}>Writer</a>
        <a href={SITE.library}>Library</a>
        <a href={BUILDER_CTA_URL}>Builder Pro</a>
      </div>
    </header>
  );
}
