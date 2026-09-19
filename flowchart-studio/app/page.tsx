import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { StudioApp } from "@/components/StudioApp";
import { buildMetadata } from "@/lib/seo";

const seo = {
  path: "/",
  keyword: "Handwriting to flowchart",
  description:
    "AI process map: photograph a handwritten scribble, talk the process through, or paste text. Edit the flowchart on a live canvas, then send it to SOP Builder Pro.",
};

export const metadata: Metadata = buildMetadata(seo);

export default function HomePage() {
  return (
    <>
      <JsonLd />
      <StudioApp />
    </>
  );
}
