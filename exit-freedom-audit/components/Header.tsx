import { Logo } from "./Logo";

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white">
      <div className="mx-auto grid h-14 max-w-5xl grid-cols-[auto_1fr] items-center gap-3 px-4 sm:grid-cols-[1fr_auto_1fr]">
        <Logo />
        <div className="min-w-0 text-right sm:text-center">
          <p className="truncate text-sm font-semibold text-zinc-950 sm:text-base">{title}</p>
          {subtitle ? <p className="truncate text-[11px] text-zinc-500">{subtitle}</p> : null}
        </div>
        <span className="hidden sm:block" aria-hidden />
      </div>
    </header>
  );
}
