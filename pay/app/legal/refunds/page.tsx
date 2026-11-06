import type { Metadata } from "next";
import { productMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = productMetadata({
  path: "/legal/refunds",
  title: "Refund policy | SOP Mojo Pay",
  description: "How refunds work for SOP Mojo Pay purchases.",
});

export default function RefundsPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 text-base leading-7 text-zinc-300">
      <h1 className="font-display text-4xl font-semibold text-zinc-50">Refund policy</h1>
      <p className="mt-4">
        Email {SITE.founderEmail} from the address you used at checkout and say which product you want refunded. If we refund that charge in Stripe, access for that product is removed. A refund of Builder Pro does not remove Flowchart Plus, and the reverse is also true.
      </p>
      <p className="mt-4">
        Canceling a subscription stops the next renewal. It does not by itself refund a charge that already succeeded.
      </p>
    </article>
  );
}
