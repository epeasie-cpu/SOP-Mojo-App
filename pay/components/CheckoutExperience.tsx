"use client";

import { CheckoutProvider, PaymentElement, useCheckout } from "@stripe/react-stripe-js/checkout";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { formatUsd, type Product } from "@/lib/catalog";
import { quoteProduct } from "@/lib/pricing";

const stripeCache = new Map<string, Promise<Stripe | null>>();

function getStripe(publishableKey: string) {
  if (typeof window === "undefined") return Promise.resolve(null);
  const cached = stripeCache.get(publishableKey);
  if (cached) return cached;
  const promise = loadStripe(publishableKey);
  stripeCache.set(publishableKey, promise);
  return promise;
}

const appearance = {
  theme: "night" as const,
  variables: {
    colorPrimary: "#b0ff56",
    colorBackground: "#18181b",
    colorText: "#f4f4f5",
    colorDanger: "#fda4af",
    borderRadius: "4px",
  },
};

function readyEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function PayFields({
  email,
  annual,
  bump,
  sessionId,
  productId,
  payLabel,
}: {
  email: string;
  annual: boolean;
  bump: boolean;
  sessionId: string;
  productId: string;
  payLabel: string;
}) {
  const checkout = useCheckout();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const buyer = readyEmail(email);
  const ready = checkout.type === "success";
  const actionsRef = useRef<Extract<typeof checkout, { type: "success" }>["checkout"] | null>(null);
  const selectionRef = useRef({ annual, bump, buyer });
  const queueRef = useRef(Promise.resolve());

  useEffect(() => {
    actionsRef.current = checkout.type === "success" ? checkout.checkout : null;
    selectionRef.current = { annual, bump, buyer };
  });

  const enqueue = useCallback((task: () => Promise<void>) => {
    const run = queueRef.current.then(task, task);
    queueRef.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }, []);

  const patchSession = useCallback(async (lineItems: boolean, nextBuyer: string | null, nextAnnual: boolean, nextBump: boolean) => {
    const response = await fetch("/api/checkout/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        slug: productId,
        email: nextBuyer,
        annual: nextAnnual,
        bump: nextBump,
        lineItems,
      }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new Error(body.error || "Could not update checkout.");
  }, [productId, sessionId]);

  useEffect(() => {
    if (!ready || !buyer) return;
    const handle = window.setTimeout(() => {
      void enqueue(async () => {
        const actions = actionsRef.current;
        const latest = selectionRef.current;
        const nextBuyer = latest.buyer;
        if (!actions || !nextBuyer) return;
        const emailed = await actions.updateEmail(nextBuyer);
        if (emailed.type === "error") throw new Error(emailed.error.message);
        const updated = await actions.runServerUpdate(() =>
          patchSession(false, nextBuyer, latest.annual, latest.bump),
        );
        if (updated.type === "error") throw new Error(updated.error.message);
      }).then(
        () => setError(null),
        (reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not update checkout."),
      );
    }, 300);
    return () => window.clearTimeout(handle);
  }, [buyer, enqueue, patchSession, productId, ready, sessionId]);

  const sentSelection = useRef<string | null>(null);
  useEffect(() => {
    if (!ready) return;
    const selection = `${annual}:${bump}`;
    if (sentSelection.current === selection) return;
    const previous = sentSelection.current;
    sentSelection.current = selection;
    if (previous === null && selection === "false:false") return;
    void enqueue(async () => {
      const actions = actionsRef.current;
      const latest = selectionRef.current;
      if (!actions) return;
      const updated = await actions.runServerUpdate(() =>
        patchSession(true, latest.buyer, latest.annual, latest.bump),
      );
      if (updated.type === "error") throw new Error(updated.error.message);
    }).then(
      () => setError(null),
      (reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not update the total."),
    );
  }, [annual, bump, enqueue, patchSession, ready]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const buyerEmail = readyEmail(email);
    if (checkout.type !== "success" || !buyerEmail) {
      setError("Enter your email to pay.");
      return;
    }
    const actions = checkout.checkout;
    setPending(true);
    setError(null);
    try {
      await enqueue(async () => {
        const emailed = await actions.updateEmail(buyerEmail);
        if (emailed.type === "error") throw new Error(emailed.error.message);
        const updated = await actions.runServerUpdate(() => patchSession(false, buyerEmail, annual, bump));
        if (updated.type === "error") throw new Error(updated.error.message);
        const result = await actions.confirm({ email: buyerEmail, redirect: "always" });
        if (result.type === "error") throw new Error(result.error.message);
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Payment could not start.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-4">
      {checkout.type === "error" ? (
        <p className="text-sm text-rose-300" role="alert">
          {checkout.error.message}
        </p>
      ) : (
        <PaymentElement
          options={{
            layout: "tabs",
            wallets: { applePay: "auto", googlePay: "auto" },
          }}
        />
      )}
      {error ? (
        <p className="text-sm text-rose-300" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending || !ready || !buyer}
        className="min-h-12 w-full rounded-sm bg-lime px-4 text-base font-semibold text-lime-ink disabled:opacity-60"
      >
        {pending ? "Paying…" : payLabel}
      </button>
    </form>
  );
}

function LegalLine({ billingLine }: { billingLine: string | null }) {
  return (
    <p className="mt-4 text-center text-sm leading-6 text-zinc-400">
      {billingLine ? <span className="text-zinc-200">{billingLine}. </span> : null}
      <a className="underline" href="/legal/terms" target="_blank" rel="noreferrer">
        Terms
      </a>
      {" · "}
      <a className="underline" href="/legal/refunds" target="_blank" rel="noreferrer">
        Refund policy
      </a>
    </p>
  );
}

export function CheckoutExperience({
  product,
  publishableKey,
  mode,
  embed,
  clientSecret,
  sessionId,
  sessionError,
}: {
  product: Product;
  publishableKey: string;
  mode: "test" | "live";
  embed: boolean;
  clientSecret: string | null;
  sessionId: string | null;
  sessionError: string | null;
}) {
  const [email, setEmail] = useState("");
  const [annual, setAnnual] = useState(false);
  const [bump, setBump] = useState(false);
  const quote = quoteProduct(product, { annual, bump });
  const paymentMounted = Boolean(clientSecret && sessionId && publishableKey);

  return (
    <div className={`mx-auto w-full max-w-lg px-4 ${embed ? "py-4" : "py-8"}`}>
      <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-sm bg-zinc-900 object-cover" />
          ) : null}
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-50">{product.title}</h1>
            <p className="mt-1 text-sm leading-6 text-zinc-400">{product.description}</p>
          </div>
        </div>
        <p className="mt-4 text-2xl font-semibold text-lime">{quote.summary}</p>
        {mode === "test" ? (
          <p className="mt-2 text-sm text-zinc-500">Test mode. Card 4242 4242 4242 4242, any future date, any CVC.</p>
        ) : null}
        <label className="mt-5 block text-sm font-medium text-zinc-200" htmlFor="buyer-email">
          Email
        </label>
        <input
          id="buyer-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 min-h-12 w-full rounded-sm border border-zinc-700 bg-zinc-900 px-3 text-base text-zinc-50"
          placeholder="you@company.com"
          aria-describedby="buyer-email-hint"
        />
        <p id="buyer-email-hint" className="mt-1 text-sm text-zinc-500">
          Required before you pay.
        </p>
        {product.annual ? (
          <label className="mt-4 flex min-h-12 items-start gap-3 text-sm leading-6 text-zinc-200">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 accent-lime"
              checked={annual}
              onChange={(event) => setAnnual(event.target.checked)}
            />
            <span>
              {product.annual.label}
              <span className="mt-0.5 block text-zinc-400">
                {formatUsd(product.annual.priceCents)} instead of {formatUsd(product.priceCents)}/month
              </span>
            </span>
          </label>
        ) : null}
        {product.orderBump ? (
          <label className="mt-3 flex min-h-12 items-start gap-3 rounded-sm border border-zinc-800 p-3 text-sm leading-6 text-zinc-200">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 accent-lime"
              checked={bump}
              onChange={(event) => setBump(event.target.checked)}
            />
            <span>
              Add {product.orderBump.title} — {formatUsd(product.orderBump.priceCents)}
              {product.orderBump.description ? (
                <span className="mt-0.5 block text-zinc-400">{product.orderBump.description}</span>
              ) : null}
            </span>
          </label>
        ) : null}
        <div data-payment-slot={paymentMounted ? "mounted" : "unavailable"}>
          {paymentMounted ? (
            <CheckoutProvider
              stripe={getStripe(publishableKey)}
              options={{ clientSecret: clientSecret ?? "", elementsOptions: { appearance } }}
            >
              <PayFields
                email={email}
                annual={annual}
                bump={bump}
                sessionId={sessionId ?? ""}
                productId={product.id}
                payLabel={`Pay ${quote.summary}`}
              />
            </CheckoutProvider>
          ) : (
            <p className="mt-4 text-sm text-amber-200" role="status">
              {sessionError ||
                (publishableKey
                  ? "Payment fields could not be loaded."
                  : "Stripe test keys are not set yet. Add them and this page can take a test card.")}
            </p>
          )}
        </div>
        <LegalLine billingLine={quote.billingLine} />
      </article>
    </div>
  );
}
