import {
  LOCKED_ENTITLEMENTS,
  clearLegacyUnlockStorage,
  snapshotFromApi,
  type EntitlementSnapshot,
} from "./entitlements";

type Listener = () => void;
const listeners = new Set<Listener>();

const SERVER_LOCKED: EntitlementSnapshot = {
  flowchart_plus: false,
  builder_pro: false,
  source: "none",
};

let cache: EntitlementSnapshot = { ...LOCKED_ENTITLEMENTS, source: "none" };
let qaQuery: string | null = null;

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeEntitlements(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function readEntitlementSnapshot(): EntitlementSnapshot {
  return cache;
}

export function serverEntitlementSnapshot(): EntitlementSnapshot {
  return SERVER_LOCKED;
}

export function writeEntitlementSnapshot(next: EntitlementSnapshot): EntitlementSnapshot {
  if (
    cache.flowchart_plus === next.flowchart_plus &&
    cache.builder_pro === next.builder_pro &&
    cache.source === next.source
  ) {
    return cache;
  }
  cache = next;
  emit();
  return cache;
}

export function noteQaUnlock(value: string | null | undefined): void {
  qaQuery = value?.trim() || null;
}

export function currentQaUnlock(): string | null {
  return qaQuery;
}

export async function refreshEntitlements(
  accessToken?: string | null,
  fetchImpl: typeof fetch = fetch,
): Promise<EntitlementSnapshot> {
  const unlock =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("unlock")
      : qaQuery;
  noteQaUnlock(unlock);
  if (typeof window !== "undefined") {
    clearLegacyUnlockStorage(window.localStorage);
  }
  const params = new URLSearchParams();
  if (unlock) params.set("unlock", unlock);
  const headers: HeadersInit = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const locked: EntitlementSnapshot = { ...LOCKED_ENTITLEMENTS, source: "none" };
  try {
    const response = await fetchImpl(`/api/entitlements${params.size ? `?${params}` : ""}`, {
      headers,
      cache: "no-store",
    });
    if (!response.ok) {
      writeEntitlementSnapshot(locked);
      return readEntitlementSnapshot();
    }
    const next = snapshotFromApi(await response.json());
    writeEntitlementSnapshot(next);
    return readEntitlementSnapshot();
  } catch {
    writeEntitlementSnapshot(locked);
    return readEntitlementSnapshot();
  }
}
