"use client";

import { useRef, useState, type FormEvent } from "react";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export function ChatPanel({
  messages,
  busy,
  onSend,
}: {
  messages: ChatMessage[];
  busy: boolean;
  onSend: (message: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    onSend(text);
    setDraft("");
  }

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="border-b border-zinc-800 px-4 py-3">
        <h2 className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">
          Chat edits
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Modular commands on the same graph. Try “make step 2 a yes/no branch”.
        </p>
      </div>
      <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <li className="text-sm text-zinc-500">
            The canvas stays editable. Chat is for branches, deletes, and rewrites — not a full regen
            unless you ask.
          </li>
        ) : (
          messages.map((message) => (
            <li
              key={message.id}
              className={`rounded-md px-3 py-2 text-sm ${
                message.role === "user"
                  ? "bg-zinc-800 text-zinc-100"
                  : "border border-zinc-800 bg-zinc-950 text-zinc-300"
              }`}
            >
              {message.text}
            </li>
          ))
        )}
      </ul>
      <form ref={formRef} onSubmit={submit} className="border-t border-zinc-800 p-3">
        <label className="sr-only" htmlFor="chat-input">
          Edit the flowchart
        </label>
        <textarea
          id="chat-input"
          rows={3}
          value={draft}
          disabled={busy}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
          placeholder="Delete step 4, rewrite all, fix the decision…"
          className="w-full resize-none rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-lime"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="mt-2 w-full rounded-sm bg-lime px-3 py-2 text-sm font-semibold text-lime-ink disabled:opacity-40"
        >
          {busy ? "Editing…" : "Apply edit"}
        </button>
      </form>
    </section>
  );
}
