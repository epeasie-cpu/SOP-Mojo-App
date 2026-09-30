import type { Metadata } from "next";
import { AuditApp } from "@/components/AuditApp";
import { JsonLd } from "@/components/JsonLd";
import { MarketingHome } from "@/components/MarketingHome";
import { pageByPath } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

const page = pageByPath("/");

export const metadata: Metadata = buildMetadata(page);

export default function HomePage() {
  return (
    <>
      <JsonLd page={page} />
      <AuditApp>
        <MarketingHome />
      </AuditApp>
    </>
  );
}
