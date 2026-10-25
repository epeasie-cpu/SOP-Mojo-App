import { Open_Sans, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";

const qmsDisplay = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-qms-display",
  display: "swap",
});

const qmsBody = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-qms-body",
  display: "swap",
});

export function QmsFrame({ children }: { children: ReactNode }) {
  return (
    <div className={`${qmsDisplay.variable} ${qmsBody.variable} qms-root bg-[#0C0E0C] text-zinc-100`}>
      <style>{`
        .qms-root { font-family: var(--font-qms-body), "Open Sans", sans-serif; }
        .qms-root :is(h1, h2, h3) { font-family: var(--font-qms-display), "Space Grotesk", sans-serif; }
      `}</style>
      {children}
    </div>
  );
}
