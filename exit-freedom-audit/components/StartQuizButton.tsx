"use client";

import { createContext, useContext } from "react";

const StartQuizContext = createContext<(() => void) | null>(null);

export function StartQuizProvider({
  onStart,
  children,
}: {
  onStart: () => void;
  children: React.ReactNode;
}) {
  return <StartQuizContext.Provider value={onStart}>{children}</StartQuizContext.Provider>;
}

export function StartQuizButton({ children = "Start the Audit →" }: { children?: string }) {
  const onStart = useContext(StartQuizContext);
  return (
    <button
      type="button"
      onClick={() => onStart?.()}
      className="mt-8 inline-flex min-h-12 items-center justify-center rounded-lg bg-zinc-950 px-5 text-base font-semibold text-white hover:bg-zinc-800"
    >
      {children}
    </button>
  );
}
