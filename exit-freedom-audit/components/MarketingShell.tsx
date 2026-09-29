import type { ReactNode } from "react";
import { Header } from "./Header";
import { SiteFooter } from "./SiteFooter";

export function MarketingShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <>
      <Header title={title} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
