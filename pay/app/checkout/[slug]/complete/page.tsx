import { headers } from "next/headers";
import Link from "next/link";
import { ManageSubscription } from "@/components/ManageSubscription";
import { ShareProduct } from "@/components/ShareProduct";
import { createCatalogStore } from "@/lib/catalog-store";
import { checkoutPath } from "@/lib/links";
import { checkoutMetadata } from "@/lib/seo";
import { otherProductLinks, successHeadline } from "@/lib/success";
import { normalizeEmail } from "@/lib/stripe-events";
import { SITE } from "@/lib/site";
import { stripeClient } from "@/lib/stripe-client";
import { stripeCredentials } from "@/lib/stripe-mode";

export const dynamic = "force-dynamic";

export const metadata = checkoutMetadata("Payment received | SOP Mojo");

function requestOrigin(hostHeader: string | null, protoHeader: string | null): string {
  const host = (hostHeader ?? "").split(",")[0]?.trim() ?? "";
  if (!host) return SITE.host;
  const proto =
    protoHeader?.split(",")[0]?.trim() ||
    (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function CompletePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const productId = decodeURIComponent(slug);
  const snapshot = await createCatalogStore().read();
  const product = snapshot.products.find((item) => item.id === productId) ?? null;
  const sessionId = query.session_id?.trim() ?? "";
  let status = "open";
  let buyerEmail: string | null = null;
  if (sessionId) {
    const creds = stripeCredentials(process.env, snapshot.settings.stripeMode);
    if (creds.secretKey) {
      try {
        const session = await stripeClient(creds.secretKey).checkout.sessions.retrieve(sessionId);
        status = session.status ?? "open";
        buyerEmail = normalizeEmail(session.customer_details?.email) || normalizeEmail(session.customer_email);
      } catch {
        status = "unknown";
      }
    }
  }
  const paid = status === "complete";
  const title = product?.title ?? "";
  const headerList = await headers();
  const origin = requestOrigin(headerList.get("x-forwarded-host") ?? headerList.get("host"), headerList.get("x-forwarded-proto"));
  const shareUrl = `${origin}/p/${encodeURIComponent(productId)}`;
  const others = otherProductLinks(snapshot.products, productId);

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
        <h1 className="font-display text-4xl font-semibold tracking-tight text-balance text-zinc-50">
          {paid ? successHeadline(title) : "Payment not finished"}
        </h1>
        {paid ? (
          <div className="mt-4 grid gap-3 text-base leading-7 text-zinc-300">
            <p>Check your email for your username and password.</p>
            <p>Check your junk and spam folder too.</p>
          </div>
        ) : (
          <p className="mt-4 text-base leading-7 text-zinc-300">
            The card was not charged, or Stripe is still confirming it. You can try the checkout again.
          </p>
        )}
        {paid && product?.billing === "month" ? (
          <div className="mt-6">
            <ManageSubscription email={buyerEmail} />
          </div>
        ) : null}
        {paid ? (
          <div className="mt-8">
            <ShareProduct title={title} url={shareUrl} />
          </div>
        ) : (
          <Link
            href={checkoutPath(productId)}
            className="mt-8 inline-flex min-h-14 w-full items-center justify-center rounded-sm border border-zinc-700 px-4 text-center text-base font-semibold text-zinc-100"
          >
            Try checkout again
          </Link>
        )}
        <section className="mt-8 border-t border-zinc-800 pt-6">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-400 uppercase">Other SOP Mojo products</h2>
          <ul className="mt-3 grid gap-3">
            {others.map((item) => (
              <li key={`${item.href}:${item.title}`}>
                {item.href.startsWith("http") ? (
                  <a
                    href={item.href}
                    className="flex min-h-14 w-full items-center rounded-sm border border-zinc-700 px-4 text-base text-zinc-100"
                  >
                    {item.title}
                  </a>
                ) : (
                  <Link
                    href={item.href}
                    className="flex min-h-14 w-full items-center rounded-sm border border-zinc-700 px-4 text-base text-zinc-100"
                  >
                    {item.title}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      </article>
    </div>
  );
}
