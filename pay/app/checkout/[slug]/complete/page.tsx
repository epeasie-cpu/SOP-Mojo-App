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
  const actionClass =
    "inline-flex min-h-14 w-full items-center justify-center rounded-sm bg-lime px-4 text-center text-base font-semibold text-lime-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8 sm:py-12">
      <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 sm:p-8">
        {paid ? (
          <div
            className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-lime text-lime-ink"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        ) : null}
        <h1 className="font-display text-4xl font-semibold tracking-tight text-zinc-50">
          {paid ? "You’re in" : "Payment not finished"}
        </h1>
        <p className="mt-4 text-base leading-7 text-zinc-300">
          {paid
            ? "Check your email for your SOP Mojo username and password. Access follows that same email in Flowchart Studio and Builder Pro."
            : "The card was not charged, or Stripe is still confirming it. You can try the checkout again."}
        </p>
        <div className="mt-8 grid gap-3">
          <a className={actionClass} href={SITE.flowchart}>
            Open Flowchart Studio
          </a>
          <a className={actionClass} href={SITE.builder}>
            Open Builder Pro
          </a>
          {paid ? null : (
            <Link
              href="/"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-sm border border-zinc-700 px-4 text-center text-base font-semibold text-zinc-200"
            >
              Back to products
            </Link>
          )}
        </div>
      </article>
    </div>
  );
}
