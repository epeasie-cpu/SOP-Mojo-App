import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SITE } from "@/lib/site";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.host),
  applicationName: SITE.name,
  title: {
    default: `${SITE.name} | Business Operations Audit | ${SITE.parentName}`,
    template: "%s",
  },
  description: SITE.tagline,
  authors: [{ name: SITE.parentName, url: SITE.parent }],
  creator: SITE.parentName,
  publisher: SITE.parentName,
  category: "business",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: SITE.parentName,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-page font-sans text-zinc-950">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-zinc-950 focus:px-3 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
