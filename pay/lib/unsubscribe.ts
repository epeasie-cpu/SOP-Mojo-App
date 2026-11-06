import { unsubscribeMailchimpMember } from "./mailchimp";
import {
  readUnsubscribeToken,
  suppressionKey,
  unsubscribeRateLimited,
  unsubscribeSecret,
} from "./can-spam";
import { createEventStore, type EventStore } from "./event-store";

export type UnsubscribeResult = "ok" | "invalid" | "rate";

/** Verify the token, then suppress marketing sends and unsubscribe in Mailchimp. Idempotent. */
export async function performUnsubscribe(input: {
  token: string;
  ip: string;
  env: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  store?: EventStore;
  now?: number;
}): Promise<UnsubscribeResult> {
  if (!unsubscribeSecret(input.env)) return "invalid";
  const email = readUnsubscribeToken(input.token, input.env);
  if (!email) return "invalid";
  if (unsubscribeRateLimited(input.ip, input.now ?? Date.now())) return "rate";
  const store = input.store ?? createEventStore(input.env);
  await store.claimCredentialSend(suppressionKey(email));
  await unsubscribeMailchimpMember({ email, env: input.env, fetchImpl: input.fetchImpl });
  return "ok";
}
