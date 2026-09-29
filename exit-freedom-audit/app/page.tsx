import type { Metadata } from "next";
import { AuditApp } from "@/components/AuditApp";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `${SITE.name} | ${SITE.product}`,
  description: SITE.tagline,
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <AuditApp />;
}
