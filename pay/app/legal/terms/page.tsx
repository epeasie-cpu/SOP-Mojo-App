import type { Metadata } from "next";
import { productMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = productMetadata({
  path: "/legal/terms",
  title: "Terms | SOP Mojo Pay",
  description: "Terms for buying SOP Mojo products at pay.sopmojo.com.",
});

export default function TermsPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 text-base leading-7 text-zinc-300">
      <h1 className="font-display text-4xl font-semibold text-zinc-50">Terms</h1>
      <p className="mt-4">
        Purchases on pay.sopmojo.com are sold by {SITE.company} (SOP Mojo). You check out as a guest with the email where we should deliver access. That email is your username.
      </p>
      <p className="mt-4">
        Flowchart Plus is a one-time unlock for print and export inside Flowchart Studio. Builder Pro is a subscription for SOP Builder Pro. A subscription continues until you cancel. Cancel from the update-card page, which opens Stripe’s customer portal, or email {SITE.founderEmail}.
      </p>
      <p className="mt-4">
        Digital access is personal to the purchasing email. Don’t share the sign-in. Questions: {SITE.founderEmail}.
      </p>
    </article>
  );
}
