export const SITE = {
  name: "SOP Mojo Pay",
  parentName: "SOP Mojo",
  company: "Mojo Business Solutions LLC",
  host: "https://pay.sopmojo.com",
  parent: "https://www.sopmojo.com",
  builder: "https://builder.sopmojo.com",
  flowchart: "https://flowchart.sopmojo.com",
  founderEmail: "ryan@sopmojo.com",
  founderName: "Ryan Pease",
  tagline: "Checkout for SOP Mojo products.",
  lime: "#B0FF56",
  limeInk: "#10140c",
  zinc: "#09090b",
} as const;

export const DEFAULT_ADMIN_EMAIL = SITE.founderEmail;

export const ENTITLEMENTS_WEBHOOK_URL =
  "https://flowchart.sopmojo.com/api/webhooks/entitlements";

/** Mojo Business Solutions LLC audience. Same list the other SOP Mojo apps use. */
export const DEFAULT_MAILCHIMP_AUDIENCE_ID = "7c2226f741";

export function publicOrigin(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.NEXT_PUBLIC_PAY_ORIGIN?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return SITE.host;
}

export function absoluteUrl(path: string, env?: NodeJS.ProcessEnv): string {
  const origin = publicOrigin(env);
  if (!path || path === "/") return origin;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
