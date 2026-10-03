import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { readAdminConfig } from "./fulfillment";

export type EventStore = {
  has(eventId: string): Promise<boolean>;
  mark(eventId: string, type: string): Promise<void>;
  /** True when this caller should send the credential email. */
  claimCredentialSend(email: string): Promise<boolean>;
  releaseCredentialSend(email: string): Promise<void>;
};

export function memoryEventStore(): EventStore {
  const events = new Set<string>();
  const sends = new Set<string>();
  return {
    async has(eventId) {
      return events.has(eventId);
    },
    async mark(eventId) {
      events.add(eventId);
    },
    async claimCredentialSend(email) {
      const key = email.trim().toLowerCase();
      if (sends.has(key)) return false;
      sends.add(key);
      return true;
    },
    async releaseCredentialSend(email) {
      sends.delete(email.trim().toLowerCase());
    },
  };
}

type FileState = { events: Record<string, string>; sends: string[] };

async function readState(filePath: string): Promise<FileState> {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8")) as FileState;
    return {
      events: parsed.events ?? {},
      sends: parsed.sends ?? [],
    };
  } catch {
    return { events: {}, sends: [] };
  }
}

export function fileEventStore(filePath: string): EventStore {
  let chain: Promise<unknown> = Promise.resolve();
  function update(mutate: (state: FileState) => void): Promise<void> {
    chain = chain.then(async () => {
      const state = await readState(filePath);
      mutate(state);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, JSON.stringify(state));
    });
    return chain as Promise<void>;
  }
  return {
    async has(eventId) {
      const state = await readState(filePath);
      return Boolean(state.events[eventId]);
    },
    async mark(eventId, type) {
      await update((state) => {
        state.events[eventId] = type;
      });
    },
    async claimCredentialSend(email) {
      const key = email.trim().toLowerCase();
      const state = await readState(filePath);
      if (state.sends.includes(key)) return false;
      await update((next) => {
        if (!next.sends.includes(key)) next.sends.push(key);
      });
      return true;
    },
    async releaseCredentialSend(email) {
      const key = email.trim().toLowerCase();
      await update((state) => {
        state.sends = state.sends.filter((value) => value !== key);
      });
    },
  };
}

function restHeaders(key: string, json = false): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

export function supabaseEventStore(input: {
  url: string;
  serviceRoleKey: string;
  fetchImpl?: typeof fetch;
}): EventStore {
  const fetchImpl = input.fetchImpl ?? fetch;
  const eventsUrl = `${input.url}/rest/v1/pay_stripe_events`;
  const sendsUrl = `${input.url}/rest/v1/pay_credential_sends`;
  return {
    async has(eventId) {
      const response = await fetchImpl(
        `${eventsUrl}?event_id=eq.${encodeURIComponent(eventId)}&select=event_id`,
        { headers: restHeaders(input.serviceRoleKey) },
      );
      if (!response.ok) throw new Error(`Event lookup failed (${response.status}).`);
      const rows = (await response.json()) as unknown[];
      return Array.isArray(rows) && rows.length > 0;
    },
    async mark(eventId, type) {
      const response = await fetchImpl(eventsUrl, {
        method: "POST",
        headers: {
          ...restHeaders(input.serviceRoleKey, true),
          Prefer: "resolution=ignore-duplicates,return=minimal",
        },
        body: JSON.stringify({ event_id: eventId, type }),
      });
      if (!response.ok && response.status !== 409) {
        throw new Error(`Event store failed (${response.status}).`);
      }
    },
    async claimCredentialSend(email) {
      const response = await fetchImpl(sendsUrl, {
        method: "POST",
        headers: {
          ...restHeaders(input.serviceRoleKey, true),
          Prefer: "resolution=ignore-duplicates,return=representation",
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (response.status === 409) return false;
      if (!response.ok) throw new Error(`Credential claim failed (${response.status}).`);
      const rows = (await response.json().catch(() => [])) as unknown[];
      return Array.isArray(rows) && rows.length > 0;
    },
    async releaseCredentialSend(email) {
      const response = await fetchImpl(
        `${sendsUrl}?email=eq.${encodeURIComponent(email.trim().toLowerCase())}`,
        { method: "DELETE", headers: restHeaders(input.serviceRoleKey) },
      );
      if (!response.ok) throw new Error(`Credential release failed (${response.status}).`);
    },
  };
}

const memorySingleton = memoryEventStore();

export function createEventStore(env: NodeJS.ProcessEnv = process.env): EventStore {
  const admin = readAdminConfig(env);
  if (admin) return supabaseEventStore(admin);
  if (env.VERCEL) return memorySingleton;
  return fileEventStore(path.join(process.cwd(), "data", "stripe-events.json"));
}
