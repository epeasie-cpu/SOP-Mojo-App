/**
 * Permanent redirects. Next.js `permanent: true` responds with 308, which
 * search engines cache as a permanent redirect (the method-preserving successor to 301).
 */
export const PERMANENT_REDIRECTS = [
  {
    source: "/use-cases/employee-onboarding",
    destination: "/sop-templates/employee-onboarding-sop-template",
  },
] as const;
