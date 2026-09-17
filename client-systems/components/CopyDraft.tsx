"use client";

import { useState } from "react";

export function CopyDraft({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2">
      <textarea
        readOnly
        value={text}
        rows={16}
        className="w-full rounded-md border border-line bg-white p-3 font-mono text-sm"
      />
      <button
        type="button"
        className="rounded-sm bg-forest px-3 py-2 text-sm font-semibold text-white"
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? "Copied" : "Copy welcome draft"}
      </button>
    </div>
  );
}
