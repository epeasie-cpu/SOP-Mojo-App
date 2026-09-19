export const UNLOCK_STORAGE_KEY = "flowchart-studio-unlocked";
export const UNLOCK_SOURCE_KEY = "flowchart-studio-unlock-source";

export const PREMIUM_ACTIONS = ["print", "export", "send"] as const;
export type PremiumAction = (typeof PREMIUM_ACTIONS)[number];

export type UnlockSource = "none" | "standalone" | "builder-pro";

export type UnlockState = {
  unlocked: boolean;
  source: UnlockSource;
};

export const UNLOCK_COPY = {
  headline: "Unlock with Builder Pro",
  standalone: "Optional $19 unlock",
  builder: "Builder Pro $39/mo includes flowchart print, export, and import",
  print: "Print is included with Builder Pro.",
  export: "Export (JSON / PNG) is included with Builder Pro.",
  send: "Send to Builder Pro is included with Builder Pro.",
} as const;

export function parseUnlockFlag(value: string | null | undefined): UnlockState {
  if (value === "builder-pro" || value === "builder") {
    return { unlocked: true, source: "builder-pro" };
  }
  if (value === "standalone" || value === "true" || value === "1" || value === "yes") {
    return { unlocked: true, source: "standalone" };
  }
  return { unlocked: false, source: "none" };
}

export function canUsePremium(state: UnlockState): boolean {
  return state.unlocked;
}

export function readUnlockFromStorage(
  storage: Pick<Storage, "getItem"> | null | undefined,
): UnlockState {
  if (!storage) return { unlocked: false, source: "none" };
  const source = storage.getItem(UNLOCK_SOURCE_KEY);
  if (source) return parseUnlockFlag(source);
  return parseUnlockFlag(storage.getItem(UNLOCK_STORAGE_KEY));
}

export function writeUnlockToStorage(
  storage: Pick<Storage, "setItem">,
  source: Exclude<UnlockSource, "none">,
): UnlockState {
  storage.setItem(UNLOCK_STORAGE_KEY, "true");
  storage.setItem(UNLOCK_SOURCE_KEY, source);
  return { unlocked: true, source };
}

export function clearUnlockFromStorage(storage: Pick<Storage, "removeItem">): UnlockState {
  storage.removeItem(UNLOCK_STORAGE_KEY);
  storage.removeItem(UNLOCK_SOURCE_KEY);
  return { unlocked: false, source: "none" };
}

export function gateLabel(action: PremiumAction): string {
  if (action === "print") return UNLOCK_COPY.print;
  if (action === "export") return UNLOCK_COPY.export;
  return UNLOCK_COPY.send;
}
