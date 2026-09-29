export const SITE = {
  name: "Ops Scalability Score",
  product: "Ops Audit",
  parentName: "SOP Mojo",
  host: "https://audit.sopmojo.com",
  parent: "https://www.sopmojo.com",
  founderName: "Ryan Pease",
  founderEmail: "ryan@sopmojo.com",
  writer: "https://writer.sopmojo.com",
  studio: "https://flowchart.sopmojo.com",
  builder: "https://builder.sopmojo.com",
  builderPro:
    "https://rpease1.mysamcart.com/checkout/builder-pro#samcart-slide-open-left",
  tagline:
    "A 3-minute ops audit for operations teams and leaders who own how work runs.",
} as const;

/** Not limited to CEOs or COOs. */
export const AUDIENCE =
  "operations teams and leaders — ops managers, team leads, and anyone who owns how work runs";

export const PRODUCT_LINKS = [
  { href: SITE.writer, label: "writer.sopmojo.com" },
  { href: SITE.studio, label: "flowchart.sopmojo.com" },
  { href: SITE.builder, label: "builder.sopmojo.com" },
] as const;
