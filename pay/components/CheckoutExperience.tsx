"use client";

import { CheckoutProvider, PaymentElement, useCheckout } from "@stripe/react-stripe-js/checkout";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { useEffect, useState, type FormEvent } from "react";
import { formatUsd, type Product } from "@/lib/catalog";
import { quoteProduct } from "@/lib/pricing";

const stripeCache = new Map<string, Promise<Stripe | null>>();

function getStripe(publishableKey: string) {
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

function PayFields({ email, payLabel }: { email: string; payLabel: string }) {
  const checkout = useCheckout();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (checkout.type !== "success") return;
    setPending(true);
    setError(null);
    const result = await checkout.checkout.confirm({ email, redirect: "always" });
    if (result.type === "error") {
      setError(result.error.message);
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
        disabled={pending || checkout.type !== "success"}
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
}: {
  product: Product;
  publishableKey: string;
  mode: "test" | "live";
  embed: boolean;
}) {
  const [email, setEmail] = useState("");
  const [annual, setAnnual] = useState(false);
  const [bump, setBump] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const quote = quoteProduct(product, { annual, bump });
  const emailReady = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  function updateEmail(value: string) {
    setEmail(value);
    setClientSecret(null);
  }

  function updateAnnual(value: boolean) {
    setAnnual(value);
    setClientSecret(null);
  }

  function updateBump(value: boolean) {
    setBump(value);
    setClientSecret(null);
  }

  useEffect(() => {
    if (!publishableKey || !emailReady) return;
    const controller = new AbortController();
    const handle = window.setTimeout(() => {
      setLoadError(null);
      void fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          slug: product.id,
          email,
          annual,
          bump,
          returnOrigin: window.location.origin,
        }),
      })
        .then(async (response) => {
          const body = (await response.json().catch(() => ({}))) as { clientSecret?: string; error?: string };
          if (!response.ok || !body.clientSecret) {
            throw new Error(body.error || "Could not start checkout.");
          }
          setClientSecret(body.clientSecret);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setClientSecret(null);
          setLoadError(error instanceof Error ? error.message : "Could not start checkout.");
        });
    }, 300);
    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [annual, bump, email, emailReady, product.id, publishableKey]);

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
          onChange={(event) => updateEmail(event.target.value)}
          className="mt-1 min-h-12 w-full rounded-sm border border-zinc-700 bg-zinc-900 px-3 text-base text-zinc-50"
          placeholder="you@company.com"
        />
        {product.annual ? (
          <label className="mt-4 flex min-h-12 items-start gap-3 text-sm leading-6 text-zinc-200">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 accent-lime"
              checked={annual}
              onChange={(event) => updateAnnual(event.target.checked)}
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
              onChange={(event) => updateBump(event.target.checked)}
            />
            <span>
              Add {product.orderBump.title} — {formatUsd(product.orderBump.priceCents)}
              {product.orderBump.description ? (
                <span className="mt-0.5 block text-zinc-400">{product.orderBump.description}</span>
              ) : null}
            </span>
          </label>
        ) : null}
        {!publishableKey ? (
          <p className="mt-4 text-sm text-amber-200" role="status">
            Stripe test keys are not set yet. Add them and this page can take a test card.
          </p>
        ) : null}
        {loadError ? (
          <p className="mt-4 text-sm text-rose-300" role="alert">
            {loadError}
          </p>
        ) : null}
        {clientSecret && publishableKey ? (
          <CheckoutProvider
            key={clientSecret}
            stripe={getStripe(publishableKey)}
            options={{ clientSecret, elementsOptions: { appearance } }}
          >
            <PayFields email={email.trim().toLowerCase()} payLabel={`Pay ${quote.summary}`} />
          </CheckoutProvider>
        ) : publishableKey ? (
          <p className="mt-4 text-sm text-zinc-500">Enter your email to load Apple Pay, Google Pay, or card.</p>
        ) : null}
        <LegalLine billingLine={quote.billingLine} />
        {clientSecret ? (
          <p className="sr-only">Total {formatUsd(quote.amountCents)}</p>
        ) : null}
      </article>
    </div>
  );
}
