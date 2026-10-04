"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  centsFromDollars,
  type AnnualOption,
  type CatalogSnapshot,
  type EntitlementProduct,
  type OrderBump,
  type Product,
} from "@/lib/catalog";
import { embedSnippet, stableUrl } from "@/lib/links";
import {
  derivedSeoDescription,
  derivedSeoTitle,
  followSeoCopy,
  prettyJsonLd,
  resolvedSeo,
  type SeoSource,
} from "@/lib/product-seo";
import { TAX_PENDING_NOTICE } from "@/lib/tax";

type Draft = {
  id: string;
  title: string;
  description: string;
  price: string;
  imageUrl: string;
  billing: "once" | "month";
  annualEnabled: boolean;
  annualPrice: string;
  annualLabel: string;
  bumpEnabled: boolean;
  bumpTitle: string;
  bumpDescription: string;
  bumpPrice: string;
  bumpEntitlement: "" | EntitlementProduct;
  presentation: "page" | "panel";
  entitlementProduct: "" | EntitlementProduct;
  seoTitle: string;
  seoDescription: string;
  active: boolean;
};

function money(cents: number): string {
  return (cents / 100).toFixed(2);
}

function sourceOf(draft: Pick<Draft, "id" | "title" | "description" | "price" | "billing" | "annualEnabled" | "annualPrice" | "imageUrl">): SeoSource {
  return {
    id: draft.id,
    title: draft.title,
    description: draft.description,
    priceCents: centsFromDollars(draft.price) ?? 0,
    billing: draft.billing,
    annualPriceCents: draft.billing === "month" && draft.annualEnabled ? centsFromDollars(draft.annualPrice) : null,
    imageUrl: draft.imageUrl,
  };
}

function toDraft(product: Product): Draft {
  const source: SeoSource = {
    id: product.id,
    title: product.title,
    description: product.description,
    priceCents: product.priceCents,
    billing: product.billing,
    annualPriceCents: product.annual?.priceCents ?? null,
    imageUrl: product.imageUrl,
  };
  return {
    id: product.id,
    title: product.title,
    description: product.description,
    price: money(product.priceCents),
    imageUrl: product.imageUrl,
    billing: product.billing,
    annualEnabled: Boolean(product.annual),
    annualPrice: product.annual ? money(product.annual.priceCents) : "390.00",
    annualLabel: product.annual?.label ?? "Pay annually — $390/year (2 months free)",
    bumpEnabled: Boolean(product.orderBump),
    bumpTitle: product.orderBump?.title ?? "",
    bumpDescription: product.orderBump?.description ?? "",
    bumpPrice: product.orderBump ? money(product.orderBump.priceCents) : "19.00",
    bumpEntitlement: product.orderBump?.entitlementProduct ?? "",
    presentation: product.presentation,
    entitlementProduct: product.entitlementProduct ?? "",
    seoTitle: product.seo.title || derivedSeoTitle(source),
    seoDescription: product.seo.description || derivedSeoDescription(source),
    active: product.active,
  };
}

function blankDraft(): Draft {
  return {
    id: "",
    title: "",
    description: "",
    price: "19.00",
    imageUrl: "",
    billing: "once",
    annualEnabled: false,
    annualPrice: "390.00",
    annualLabel: "Pay annually — $390/year (2 months free)",
    bumpEnabled: false,
    bumpTitle: "",
    bumpDescription: "",
    bumpPrice: "19.00",
    bumpEntitlement: "",
    presentation: "page",
    entitlementProduct: "",
    seoTitle: "",
    seoDescription: "",
    active: true,
  };
}

function draftToProduct(draft: Draft): Product {
  const priceCents = centsFromDollars(draft.price);
  if (!priceCents) throw new Error("Price must be at least $0.50.");
  let annual: AnnualOption | null = null;
  if (draft.annualEnabled) {
    const annualCents = centsFromDollars(draft.annualPrice);
    if (!annualCents) throw new Error("Annual price must be at least $0.50.");
    annual = { priceCents: annualCents, label: draft.annualLabel.trim() || "Pay annually" };
  }
  let orderBump: OrderBump | null = null;
  if (draft.bumpEnabled) {
    const bumpCents = centsFromDollars(draft.bumpPrice);
    if (!bumpCents) throw new Error("Order bump price must be at least $0.50.");
    orderBump = {
      title: draft.bumpTitle.trim(),
      description: draft.bumpDescription.trim(),
      priceCents: bumpCents,
      entitlementProduct: draft.bumpEntitlement || null,
    };
    if (!orderBump.title) throw new Error("Order bump needs a title.");
  }
  return {
    id: draft.id.trim().toLowerCase(),
    title: draft.title.trim(),
    description: draft.description.trim(),
    priceCents,
    currency: "usd",
    imageUrl: draft.imageUrl.trim(),
    billing: draft.billing,
    annual: draft.billing === "month" ? annual : null,
    orderBump,
    presentation: draft.presentation,
    entitlementProduct: draft.entitlementProduct || null,
    seo: resolvedSeo(sourceOf(draft), { title: draft.seoTitle, description: draft.seoDescription }),
    active: draft.active,
  };
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-zinc-200">
      {label}
      {children}
    </label>
  );
}

const inputClass = "min-h-12 w-full rounded-sm border border-zinc-700 bg-zinc-900 px-3 text-base font-normal text-zinc-50";

export function AdminDashboard({
  initial,
  email,
}: {
  initial: CatalogSnapshot;
  email: string;
}) {
  const router = useRouter();
  const [products, setProducts] = useState(initial.products);
  const stripeMode = initial.settings.stripeMode;
  const taxNotice = initial.settings.taxNotice;
  const [selected, setSelected] = useState(initial.products[0]?.id ?? "");
  const [draft, setDraft] = useState<Draft>(initial.products[0] ? toDraft(initial.products[0]) : blankDraft());
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const links = useMemo(() => {
    const id = draft.id.trim().toLowerCase();
    if (!id) return null;
    return { stable: stableUrl(id), embed: embedSnippet(id, draft.title || "Buy now") };
  }, [draft.id, draft.title]);
  const jsonLdPreview = prettyJsonLd(sourceOf(draft));

  function editDraft(patch: Partial<Draft>) {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      return { ...next, ...followSeoCopy({ previous: sourceOf(prev), next: sourceOf(next), seoTitle: prev.seoTitle, seoDescription: prev.seoDescription }) };
    });
  }

  function selectProduct(id: string) {
    const product = products.find((item) => item.id === id);
    if (!product) return;
    setSelected(id);
    setDraft(toDraft(product));
    setMessage("");
  }

  async function save(nextProducts: Product[]) {
    setPending(true);
    setMessage("");
    const response = await fetch("/api/admin/catalog", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products: nextProducts, settings: { stripeMode, taxNotice } }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setPending(false);
    if (!response.ok) {
      setMessage(body.error || "Save failed.");
      return;
    }
    setProducts(nextProducts);
    setMessage("Saved.");
    router.refresh();
  }

  async function saveDraft() {
    try {
      const product = draftToProduct(draft);
      if (products.some((item) => item.id === product.id && item.id !== selected)) {
        setMessage("That product id is already used.");
        return;
      }
      const next = [...products.filter((item) => item.id !== selected && item.id !== product.id), product];
      setSelected(product.id);
      setDraft(toDraft(product));
      await save(next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Check the fields and try again.");
    }
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setMessage("Copied.");
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-lime uppercase">Catalog</p>
          <h1 className="font-display text-3xl font-semibold">Products</h1>
          <p className="text-sm text-zinc-400">{email}</p>
        </div>
        <button
          type="button"
          className="min-h-12 px-3 text-sm text-zinc-400"
          onClick={async () => {
            await fetch("/api/admin/logout", { method: "POST" });
            router.push("/admin/login");
            router.refresh();
          }}
        >
          Sign out
        </button>
      </div>

      <section className="mt-6 rounded-lg border border-zinc-800 p-4">
        <h2 className="font-semibold">Stripe mode</h2>
        <p className="mt-3 inline-flex min-h-12 items-center rounded-sm bg-lime px-4 font-semibold text-lime-ink">
          {stripeMode === "live" ? "Catalog setting: live" : "Test mode"}
        </p>
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          Checkout uses Stripe test keys. Live keys are not set. This screen does not switch the account to live mode.
        </p>
        <p className="mt-3 text-sm leading-6 text-amber-200" role="status">
          {TAX_PENDING_NOTICE}
        </p>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          One-time payments put the buyer email on the Stripe receipt. Subscriptions save that email on the customer so Stripe can email the invoice.
        </p>
      </section>

      <div className="mt-6 flex flex-wrap gap-2">
        {products.map((product) => (
          <button
            key={product.id}
            type="button"
            onClick={() => selectProduct(product.id)}
            className={`min-h-12 rounded-sm border px-3 ${selected === product.id ? "border-lime text-lime" : "border-zinc-700"}`}
          >
            {product.title}
          </button>
        ))}
        <button
          type="button"
          className="min-h-12 rounded-sm border border-dashed border-zinc-600 px-3"
          onClick={() => {
            setSelected("");
            setDraft(blankDraft());
            setMessage("");
          }}
        >
          Add product
        </button>
      </div>

      <form
        className="mt-6 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void saveDraft();
        }}
      >
        <Field label="Product id (stable link name)">
          <input className={inputClass} value={draft.id} onChange={(event) => editDraft({ id: event.target.value })} placeholder="flowchart_plus" />
        </Field>
        <Field label="Title">
          <input className={inputClass} value={draft.title} onChange={(event) => editDraft({ title: event.target.value })} />
        </Field>
        <Field label="Short description">
          <textarea className={`${inputClass} min-h-24 py-2`} value={draft.description} onChange={(event) => editDraft({ description: event.target.value })} />
        </Field>
        <Field label="Price (USD)">
          <input className={inputClass} inputMode="decimal" value={draft.price} onChange={(event) => editDraft({ price: event.target.value })} />
        </Field>
        <Field label="Icon or image URL">
          <input className={inputClass} value={draft.imageUrl} onChange={(event) => editDraft({ imageUrl: event.target.value })} placeholder="/products/flowchart.svg" />
        </Field>
        <label className="text-sm text-zinc-400">
          Or upload a small image
          <input
            type="file"
            accept="image/*"
            className="mt-1 block w-full text-sm"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (file.size > 80_000) {
                setMessage("Use an image under 80KB, or paste a URL.");
                return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                if (typeof reader.result === "string") setDraft((current) => ({ ...current, imageUrl: reader.result as string }));
              };
              reader.readAsDataURL(file);
            }}
          />
        </label>
        <Field label="Billing">
          <select className={inputClass} value={draft.billing} onChange={(event) => editDraft({ billing: event.target.value === "month" ? "month" : "once" })}>
            <option value="once">One-time</option>
            <option value="month">Monthly</option>
          </select>
        </Field>
        {draft.billing === "month" ? (
          <label className="flex min-h-12 items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-lime" checked={draft.annualEnabled} onChange={(event) => editDraft({ annualEnabled: event.target.checked })} />
            Offer an annual checkbox
          </label>
        ) : null}
        {draft.billing === "month" && draft.annualEnabled ? (
          <>
            <Field label="Annual price (USD)">
              <input className={inputClass} inputMode="decimal" value={draft.annualPrice} onChange={(event) => editDraft({ annualPrice: event.target.value })} />
            </Field>
            <Field label="Annual checkbox label">
              <input className={inputClass} value={draft.annualLabel} onChange={(event) => setDraft({ ...draft, annualLabel: event.target.value })} />
            </Field>
          </>
        ) : null}
        <label className="flex min-h-12 items-center gap-3 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-lime" checked={draft.bumpEnabled} onChange={(event) => setDraft({ ...draft, bumpEnabled: event.target.checked })} />
          Optional order bump on the same screen
        </label>
        {draft.bumpEnabled ? (
          <>
            <Field label="Bump title">
              <input className={inputClass} value={draft.bumpTitle} onChange={(event) => setDraft({ ...draft, bumpTitle: event.target.value })} />
            </Field>
            <Field label="Bump description">
              <input className={inputClass} value={draft.bumpDescription} onChange={(event) => setDraft({ ...draft, bumpDescription: event.target.value })} />
            </Field>
            <Field label="Bump price (USD)">
              <input className={inputClass} inputMode="decimal" value={draft.bumpPrice} onChange={(event) => setDraft({ ...draft, bumpPrice: event.target.value })} />
            </Field>
          </>
        ) : null}
        <Field label="Open the stable link as">
          <select className={inputClass} value={draft.presentation} onChange={(event) => setDraft({ ...draft, presentation: event.target.value === "panel" ? "panel" : "page" })}>
            <option value="page">Full checkout page</option>
            <option value="panel">Slide-out panel</option>
          </select>
        </Field>
        <Field label="Studio entitlement">
          <select
            className={inputClass}
            value={draft.entitlementProduct}
            onChange={(event) =>
              setDraft({
                ...draft,
                entitlementProduct: event.target.value === "flowchart_plus" || event.target.value === "builder_pro" ? event.target.value : "",
              })
            }
          >
            <option value="">None</option>
            <option value="flowchart_plus">flowchart_plus</option>
            <option value="builder_pro">builder_pro</option>
          </select>
        </Field>
        <fieldset className="grid gap-3 rounded-lg border border-zinc-800 p-4">
          <legend className="px-1 text-sm text-zinc-400">Public product page SEO only</legend>
          <p className="text-sm leading-6 text-zinc-400">
            Filled from the title, description, and price. Checkout stays noindex. Edit either field. Clear it to follow the product again.
          </p>
          <Field label="SEO title">
            <input
              className={inputClass}
              value={draft.seoTitle}
              onChange={(event) => {
                const value = event.target.value;
                setDraft((prev) => ({ ...prev, seoTitle: value.trim() ? value : derivedSeoTitle(sourceOf(prev)) }));
              }}
            />
          </Field>
          <Field label="SEO description">
            <textarea
              className={`${inputClass} min-h-24 py-2`}
              value={draft.seoDescription}
              onChange={(event) => {
                const value = event.target.value;
                setDraft((prev) => ({
                  ...prev,
                  seoDescription: value.trim() ? value : derivedSeoDescription(sourceOf(prev)),
                }));
              }}
            />
          </Field>
          <details className="rounded-sm border border-zinc-800">
            <summary className="min-h-12 cursor-pointer px-3 py-3 text-sm font-medium text-zinc-200">
              Advanced: generated JSON-LD
            </summary>
            <p className="px-3 text-sm leading-6 text-zinc-400">
              Built from the title, description, price, and public page URL. Saving does not ask you to edit this.
            </p>
            <pre className="overflow-x-auto px-3 pb-3 text-xs leading-5 text-zinc-300">{jsonLdPreview}</pre>
          </details>
        </fieldset>
        <label className="flex min-h-12 items-center gap-3 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-lime" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />
          On sale
        </label>
        {links ? (
          <div className="grid gap-3 rounded-lg border border-zinc-800 p-4 text-sm">
            <p className="text-zinc-400">
              Paste both into Framer. The toggle above changes what the link does. You do not edit the Framer page again.
            </p>
            <p className="break-all text-zinc-100">{links.stable}</p>
            <button type="button" className="min-h-12 rounded-sm border border-zinc-600" onClick={() => void copy(links.stable)}>
              Copy link
            </button>
            <pre className="overflow-x-auto whitespace-pre-wrap text-zinc-300">{links.embed}</pre>
            <button type="button" className="min-h-12 rounded-sm border border-zinc-600" onClick={() => void copy(links.embed)}>
              Copy embed snippet
            </button>
          </div>
        ) : null}
        <button type="submit" disabled={pending} className="min-h-12 rounded-sm bg-lime font-semibold text-lime-ink disabled:opacity-60">
          {pending ? "Saving…" : "Save product"}
        </button>
        {selected ? (
          <button
            type="button"
            className="min-h-12 text-sm text-rose-300"
            onClick={() => {
              const next = products.filter((item) => item.id !== selected);
              setSelected(next[0]?.id ?? "");
              setDraft(next[0] ? toDraft(next[0]) : blankDraft());
              void save(next);
            }}
          >
            Remove this product
          </button>
        ) : null}
        {message ? (
          <p className="text-sm text-zinc-200" role="status">
            {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
