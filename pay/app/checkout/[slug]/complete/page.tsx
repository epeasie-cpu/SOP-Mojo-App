import Link from "next/link";
import { checkoutMetadata } from "@/lib/seo";
import { stripeClient } from "@/lib/stripe-client";
import { createCatalogStore } from "@/lib/catalog-store";
import { stripeCredentials } from "@/lib/stripe-mode";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = checkoutMetadata("Payment received | SOP Mojo");

export default async function CompletePage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const query = await searchParams;
  const sessionId = query.session_id?.trim() ?? "";
  let status = "open";
  if (sessionId) {
    const snapshot = await createCatalogStore().read();
    const creds = stripeCredentials(process.env, snapshot.settings.stripeMode);
    if (creds.secretKey) {
      try {
        const session = await stripeClient(creds.secretKey).checkout.sessions.retrieve(sessionId);
        status = session.status ?? "open";
      } catch {
        status = "unknown";
      }
    }
  }
  const paid = status === "complete";
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-12">
      <h1 className="font-display text-4xl font-semibold">{paid ? "You’re in" : "Payment not finished"}</h1>
      <p className="mt-4 text-base leading-7 text-zinc-300">
        {paid
          ? "Check your email for your SOP Mojo username and password. Access follows that same email in Flowchart Studio and Builder Pro."
          : "The card was not charged, or Stripe is still confirming it. You can try the checkout again."}
      </p>
      <div className="mt-6 grid gap-3">
        <a className="min-h-12 inline-flex items-center text-lime" href={SITE.flowchart}>
          Open Flowchart Studio
        </a>
        <a className="min-h-12 inline-flex items-center text-lime" href={SITE.builder}>
          Open Builder Pro
        </a>
        {paid ? null : (
          <Link href="/" className="min-h-12 inline-flex items-center text-zinc-300">
            Back to products
          </Link>
        )}
      </div>
    </div>
  );
}
