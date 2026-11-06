"use client";

import { useState } from "react";
import { AUP_SEO_TITLE, AUP_SHARE_LINE } from "@/lib/aup-landing";

export function AupShare({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function share() {
    const payload = { title: AUP_SEO_TITLE, text: AUP_SHARE_LINE, url };
    if (typeof navigator.share === "function") {
      try {
        await navigator.share(payload);
        return;
      } catch {
        return;
      }
    }
    await copy();
  }

  return (
    <section className="mt-10" aria-labelledby="aup-share-heading">
      <h2 id="aup-share-heading" className="font-display text-2xl font-semibold text-zinc-50">
        {AUP_SHARE_LINE}
      </h2>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            void copy();
          }}
          className="inline-flex min-h-12 items-center justify-center rounded-sm border border-lime px-4 font-semibold text-lime"
        >
          Copy link
        </button>
        <button
          type="button"
          onClick={() => {
            void share();
          }}
          className="inline-flex min-h-12 items-center justify-center rounded-sm bg-lime px-4 font-semibold text-lime-ink"
        >
          Share
        </button>
      </div>
      {copied ? (
        <p className="mt-3 text-sm text-zinc-300" role="status">
          Link copied
        </p>
      ) : null}
    </section>
  );
}
