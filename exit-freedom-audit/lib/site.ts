export const SITE = {
  name: "Exit / Freedom Readiness",
  product: "Ops Scalability Score",
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
    "A 3-minute ops gut check for owners who want an exit, family time, or a week that runs without them.",
} as const;

export const PRODUCT_LINKS = [
  { href: SITE.writer, label: "writer.sopmojo.com" },
  { href: SITE.studio, label: "flowchart.sopmojo.com" },
  { href: SITE.builder, label: "builder.sopmojo.com" },
] as const;
