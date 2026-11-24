"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { SopDraft } from "@/lib/sop";

type DraftContextValue = {
  draft: SopDraft | null;
  setDraft: (draft: SopDraft | null) => void;
};

const SopDraftContext = createContext<DraftContextValue | null>(null);

export function SopDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<SopDraft | null>(null);
  const value = useMemo(() => ({ draft, setDraft }), [draft]);
  return <SopDraftContext.Provider value={value}>{children}</SopDraftContext.Provider>;
}

export function useSopDraft(): DraftContextValue | null {
  return useContext(SopDraftContext);
}
