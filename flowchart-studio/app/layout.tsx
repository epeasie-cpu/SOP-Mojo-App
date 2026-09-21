import type { Metadata } from "next";
import { Fraunces, Geist } from "next/font/google";
import Script from "next/script";
import { Header } from "@/components/Header";
import { SAMCART_SLIDE_SCRIPT, SITE } from "@/lib/site";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.host),
  applicationName: SITE.name,
  title: {
    default: `Handwriting to flowchart | ${SITE.name} | ${SITE.parentName}`,
    template: `%s`,
  },
  description: SITE.tagline,
  keywords: [
    "handwriting to flowchart",
    "AI process map",
    "AI flowchart",
    "handwritten process map",
    "SOP flowchart",
    "Flowchart Studio",
    "SOP Mojo",
  ],
  authors: [{ name: SITE.founderName, url: SITE.parent }],
  creator: SITE.parentName,
  category: "business",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-950 font-sans text-zinc-100">
        <a
          href="#main"
          className="no-print sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-lime focus:px-3 focus:py-2 focus:text-lime-ink"
        >
          Skip to content
        </a>
        <Header />
        <main id="main" className="flex min-h-0 flex-1 flex-col">
          {children}
        </main>
        <Script src={SAMCART_SLIDE_SCRIPT} strategy="afterInteractive" />
      </body>
    </html>
  );
}
