import { randomBytes } from "node:crypto";
import { isEntitlementProduct, type EntitlementProduct } from "./catalog";
import type { EventStore } from "./event-store";
import { ENTITLEMENTS_WEBHOOK_URL } from "./site";

export type PayUser = {
  id: string;
  appMetadata: Record<string, unknown>;
};

export type AdminConfig = {
  url: string;
  serviceRoleKey: string;
};

export function readAdminConfig(env: NodeJS.ProcessEnv): AdminConfig | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) return null;
  return { url, serviceRoleKey };
}

function adminHeaders(key: string, json = false): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function credentialEmailText(input: { email: string; password: string; product: string }): string {
  return [
    "Your SOP Mojo sign-in",
    "",
    `Username: ${input.email}`,
    `Password: ${input.password}`,
    "",
    "Sign in at https://flowchart.sopmojo.com or https://builder.sopmojo.com",
    "",
    `Product: ${input.product}`,
  ].join("\n");
}

export async function lookupPayUser(
  config: AdminConfig,
  email: string,
  fetchImpl: typeof fetch,
): Promise<PayUser | null> {
  const response = await fetchImpl(`${config.url}/rest/v1/rpc/entitlement_user_id_by_email`, {
    method: "POST",
    headers: adminHeaders(config.serviceRoleKey, true),
    body: JSON.stringify({ target_email: email }),
  });
  if (!response.ok) {
    throw new Error(`Supabase user lookup failed (${response.status}).`);
  }
  const body = (await response.json().catch(() => null)) as unknown;
  const id =
    typeof body === "string"
      ? body
      : typeof asRecord(body)?.id === "string"
        ? (asRecord(body)?.id as string)
        : null;
  if (!id) return null;
  const userResponse = await fetchImpl(`${config.url}/auth/v1/admin/users/${encodeURIComponent(id)}`, {
    headers: adminHeaders(config.serviceRoleKey),
  });
  if (!userResponse.ok) return { id, appMetadata: {} };
  const user = asRecord(await userResponse.json().catch(() => null));
  const appMetadata = asRecord(user?.app_metadata) ?? {};
  return { id, appMetadata };
}

export function generatePassword(): string {
  return randomBytes(18).toString("base64url");
}

export async function createPayUser(
  config: AdminConfig,
  email: string,
  fetchImpl: typeof fetch,
): Promise<{ id: string; password: string; created: boolean }> {
  const password = generatePassword();
  const response = await fetchImpl(`${config.url}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders(config.serviceRoleKey, true),
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      app_metadata: { pay_credentials: "pending" },
    }),
  });
  if (response.status === 422) {
    await response.json().catch(() => null);
    const existing = await lookupPayUser(config, email, fetchImpl);
    if (!existing) throw new Error("Supabase said the user exists, but lookup missed them.");
    return { id: existing.id, password: "", created: false };
  }
  if (!response.ok) throw new Error(`Supabase user create failed (${response.status}).`);
  const created = asRecord(await response.json().catch(() => null));
  const id = typeof created?.id === "string" ? created.id : "";
  if (!id) throw new Error("Supabase created a user without an id.");
  return { id, password, created: true };
}

export async function updatePayUser(
  config: AdminConfig,
  userId: string,
  patch: { password?: string; appMetadata?: Record<string, unknown> },
  fetchImpl: typeof fetch,
): Promise<void> {
  const body: Record<string, unknown> = {};
  if (patch.password) body.password = patch.password;
  if (patch.appMetadata) body.app_metadata = patch.appMetadata;
  const response = await fetchImpl(`${config.url}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    headers: adminHeaders(config.serviceRoleKey, true),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Supabase user update failed (${response.status}).`);
}

export async function postEntitlement(
  input: { email: string; product: EntitlementProduct; active: boolean },
  env: NodeJS.ProcessEnv,
  fetchImpl: typeof fetch,
): Promise<{ createdUser: boolean }> {
  const secret = env.ENTITLEMENT_WEBHOOK_SECRET?.trim() || env.MAKE_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error("Set ENTITLEMENT_WEBHOOK_SECRET so purchases can unlock Studio.");
  const url = env.ENTITLEMENTS_WEBHOOK_URL?.trim() || ENTITLEMENTS_WEBHOOK_URL;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: input.email, product: input.product, active: input.active }),
  });
  if (!response.ok) {
    throw new Error(`Entitlements webhook returned ${response.status}.`);
  }
  const body = asRecord(await response.json().catch(() => null));
  return { createdUser: body?.created_user === true };
}

export async function deliverCredentials(input: {
  email: string;
  password: string;
  product: string;
  eventId: string;
  env: NodeJS.ProcessEnv;
  fetchImpl: typeof fetch;
}): Promise<"make" | "resend" | "unconfigured"> {
  const makeUrl = input.env.MAKE_CREDENTIALS_WEBHOOK_URL?.trim();
  const payload = {
    action: "email_credentials_only",
    do_not_create_user: true,
    user_exists: true,
    email: input.email,
    username: input.email,
    password: input.password,
    product: input.product,
    event_id: input.eventId,
    source: "pay.sopmojo.com",
  };
  if (makeUrl) {
    const secret = input.env.MAKE_CREDENTIALS_WEBHOOK_SECRET?.trim();
    const response = await input.fetchImpl(makeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-make-secret": secret } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Make credentials webhook returned ${response.status}.`);
    return "make";
  }
  const resendKey = input.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    const from = input.env.EMAIL_FROM?.trim() || "SOP Mojo <onboarding@resend.dev>";
    const response = await input.fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.email],
        subject: "Your SOP Mojo sign-in",
        text: credentialEmailText({ email: input.email, password: input.password, product: input.product }),
      }),
    });
    if (!response.ok) throw new Error(`Resend returned ${response.status}.`);
    return "resend";
  }
  return "unconfigured";
}

export type GrantResult = {
  createdUser: boolean;
  credentials: "sent" | "skipped_existing" | "unconfigured" | "not_applicable";
  mailer: "make" | "resend" | null;
};

export async function grantAccess(input: {
  email: string;
  products: string[];
  eventId: string;
  allowCredentials: boolean;
  env: NodeJS.ProcessEnv;
  fetchImpl: typeof fetch;
  store: EventStore;
}): Promise<GrantResult> {
  const products = input.products.filter(isEntitlementProduct);
  if (products.length === 0) {
    return { createdUser: false, credentials: "not_applicable", mailer: null };
  }
  const email = input.email.trim().toLowerCase();
  const admin = readAdminConfig(input.env);
  let user: PayUser | null = null;
  let password = "";
  let created = false;
  if (admin) {
    user = await lookupPayUser(admin, email, input.fetchImpl);
    if (!user) {
      const made = await createPayUser(admin, email, input.fetchImpl);
      created = made.created;
      password = made.password;
      user = { id: made.id, appMetadata: made.created ? { pay_credentials: "pending" } : {} };
      if (!made.created) user = await lookupPayUser(admin, email, input.fetchImpl);
    }
  }

  let webhookCreated = false;
  for (const product of products) {
    const result = await postEntitlement({ email, product, active: true }, input.env, input.fetchImpl);
    webhookCreated = webhookCreated || result.createdUser;
  }

  const pending = user?.appMetadata?.pay_credentials === "pending" || created;
  const shouldEmail = input.allowCredentials && pending;
  if (!shouldEmail) {
    return { createdUser: created || webhookCreated, credentials: "skipped_existing", mailer: null };
  }
  if (!admin || !user) {
    return { createdUser: webhookCreated, credentials: "unconfigured", mailer: null };
  }

  const claimed = await input.store.claimCredentialSend(email);
  if (!claimed) {
    await updatePayUser(
      admin,
      user.id,
      { appMetadata: { ...user.appMetadata, pay_credentials: "sent" } },
      input.fetchImpl,
    );
    return { createdUser: created || webhookCreated, credentials: "skipped_existing", mailer: null };
  }

  let mailPassword = password;
  let emailed = false;
  try {
    if (!mailPassword) {
      mailPassword = generatePassword();
      await updatePayUser(
        admin,
        user.id,
        { password: mailPassword, appMetadata: { ...user.appMetadata, pay_credentials: "pending" } },
        input.fetchImpl,
      );
    }
    const mailer = await deliverCredentials({
      email,
      password: mailPassword,
      product: products.join(","),
      eventId: input.eventId,
      env: input.env,
      fetchImpl: input.fetchImpl,
    });
    if (mailer === "unconfigured") {
      throw new Error(
        "Set MAKE_CREDENTIALS_WEBHOOK_URL or RESEND_API_KEY so the buyer receives a sign-in password.",
      );
    }
    emailed = true;
    await updatePayUser(
      admin,
      user.id,
      { appMetadata: { ...user.appMetadata, pay_credentials: "sent" } },
      input.fetchImpl,
    );
    return { createdUser: true, credentials: "sent", mailer };
  } catch (error) {
    if (!emailed) await input.store.releaseCredentialSend(email);
    throw error;
  }
}

export async function revokeAccess(input: {
  email: string;
  products: string[];
  env: NodeJS.ProcessEnv;
  fetchImpl: typeof fetch;
}): Promise<void> {
  const products = input.products.filter(isEntitlementProduct);
  const email = input.email.trim().toLowerCase();
  for (const product of products) {
    await postEntitlement({ email, product, active: false }, input.env, input.fetchImpl);
  }
}
