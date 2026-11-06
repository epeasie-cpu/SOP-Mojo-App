"use client";

import { useState } from "react";
import { shareClipboardText, shareMessage } from "@/lib/success";

export function ShareProduct({ title, url }: { title: string; url: string }) {
  const [note, setNote] = useState("");

  async function onShare() {
    const message = shareMessage(title, url);
    const clipboard = shareClipboardText(title, url);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: message.text, url: message.url });
        setNote("");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(clipboard);
      setNote("Copied. Paste it to a friend.");
    } catch {
      setNote(clipboard);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={() => void onShare()}
        className="inline-flex min-h-14 w-full items-center justify-center rounded-sm bg-lime px-4 text-center text-base font-semibold text-lime-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        Share with a friend
      </button>
      {note ? (
        <p className="break-all text-sm leading-6 text-zinc-300" role="status">
          {note}
        </p>
      ) : null}
    </div>
  );
}
