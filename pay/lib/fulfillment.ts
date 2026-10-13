import { randomBytes } from "node:crypto";
import { isEntitlementProduct, type EntitlementProduct, type Product } from "./catalog";
import type { EventStore } from "./event-store";
import { captureCheckoutLead } from "./mailchimp";
import { ENTITLEMENTS_WEBHOOK_URL, productAccessLabel, productSignInUrl } from "./site";

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

export function existingAccountUnlockKey(email: string, eventId: string): string {
  return `${email.trim().toLowerCase()}|${eventId.trim()}`;
}

export function unlockEmailText(input: {
  email: string;
  access: { title: string; url: string }[];
  resetLink: string;
}): string {
  const title = input.access.length === 1 ? input.access[0]?.title : "Your SOP Mojo products";
  return [
    `${title} is unlocked.`,
    "",
    `Sign in as ${input.email}.`,
    ...input.access.map((item) => `Sign in to ${item.title} at ${item.url}`),
    "",
    "Reset your password:",
    input.resetLink,
  ].join("\n");
}

function accessFor(products: EntitlementProduct[]): { title: string; url: string }[] {
  return products.map((product) => ({
    title: productAccessLabel(product),
    url: productSignInUrl(product),
  }));
}

/** Pay created this login and still owns the password email. */
function payOwnsCredentials(appMetadata: Record<string, unknown>, created: boolean): boolean {
  const flag = appMetadata.pay_credentials;
  return created || flag === "pending" || flag === "sent";
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

export async function createRecoveryLink(
  config: AdminConfig,
  email: string,
  redirectTo: string,
  fetchImpl: typeof fetch,
): Promise<string> {
  const response = await fetchImpl(`${config.url}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: adminHeaders(config.serviceRoleKey, true),
    body: JSON.stringify({
      type: "recovery",
      email,
      redirect_to: redirectTo,
    }),
  });
  if (!response.ok) throw new Error(`Supabase recovery link failed (${response.status}).`);
  const body = asRecord(await response.json().catch(() => null));
  const properties = asRecord(body?.properties);
  const link =
    typeof body?.action_link === "string"
      ? body.action_link
      : typeof properties?.action_link === "string"
        ? properties.action_link
        : "";
  if (!link) throw new Error("Supabase recovery link was empty.");
  return link;
}

export async function sendResendEmail(input: {
  email: string;
  subject: string;
  text: string;
  html?: string;
  env: NodeJS.ProcessEnv;
  fetchImpl: typeof fetch;
}): Promise<boolean> {
  const resendKey = input.env.RESEND_API_KEY?.trim();
  if (!resendKey) return false;
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
      subject: input.subject,
      text: input.text,
      ...(input.html ? { html: input.html } : {}),
    }),
  });
  if (!response.ok) throw new Error(`Resend returned ${response.status}.`);
  return true;
}

export function deliverySendKey(email: string, eventId: string): string {
  return `${email.trim().toLowerCase()}|${eventId.trim()}|delivery`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function deliveryEmailContent(input: { title: string; url: string; label: string }): {
  subject: string;
  text: string;
  html: string;
} {
  const title = input.title.trim() || "Your SOP Mojo download";
  const label = input.label.trim() || "Download";
  const url = input.url.trim();
  return {
    subject: `${title} is ready`,
    text: [`Your ${title} is ready.`, "", `${label}: ${url}`, "", "Check your junk and spam folder too."].join("\n"),
    html: [
      `<p>Your ${escapeHtml(title)} is ready.</p>`,
      `<p><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 18px;background:#b0ff56;color:#10140c;font-weight:600;text-decoration:none;">${escapeHtml(label)}</a></p>`,
      "<p>Check your junk and spam folder too.</p>",
    ].join(""),
  };
}

/** Email the download or access link. No app entitlement and no password. */
export async function sendDeliveryEmail(input: {
  email: string;
  eventId: string;
  product: Product;
  env: NodeJS.ProcessEnv;
  fetchImpl: typeof fetch;
  store: EventStore;
}): Promise<"sent" | "skipped"> {
  const delivery = input.product.delivery;
  if (input.product.billing !== "once" || delivery?.kind !== "email_link" || !delivery.url.trim()) {
    return "skipped";
  }
  const email = input.email.trim().toLowerCase();
  const key = deliverySendKey(email, input.eventId);
  const claimed = await input.store.claimCredentialSend(key);
  if (!claimed) return "skipped";
  try {
    const content = deliveryEmailContent({
      title: input.product.title,
      url: delivery.url.trim(),
      label: delivery.label,
    });
    const sent = await sendResendEmail({
      email,
      subject: content.subject,
      text: content.text,
      html: content.html,
      env: input.env,
      fetchImpl: input.fetchImpl,
    });
    if (!sent) {
      throw new Error("Set RESEND_API_KEY so the buyer receives the download link.");
    }
    await captureCheckoutLead({
      email,
      products: [input.product.id],
      env: input.env,
      fetchImpl: input.fetchImpl,
    });
    return "sent";
  } catch (error) {
    await input.store.releaseCredentialSend(key);
    throw error;
  }
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
  const sent = await sendResendEmail({
    email: input.email,
    subject: "Your SOP Mojo sign-in",
    text: credentialEmailText({ email: input.email, password: input.password, product: input.product }),
    env: input.env,
    fetchImpl: input.fetchImpl,
  });
  return sent ? "resend" : "unconfigured";
}

async function sendExistingUnlock(input: {
  email: string;
  products: EntitlementProduct[];
  eventId: string;
  env: NodeJS.ProcessEnv;
  fetchImpl: typeof fetch;
  store: EventStore;
}): Promise<GrantResult> {
  if (input.products.length === 0) {
    return { createdUser: false, credentials: "not_applicable", mailer: null };
  }
  const email = input.email.trim().toLowerCase();
  const key = existingAccountUnlockKey(email, input.eventId);
  const claimed = await input.store.claimCredentialSend(key);
  if (!claimed) {
    return { createdUser: false, credentials: "skipped_existing", mailer: null };
  }
  const admin = readAdminConfig(input.env);
  if (!admin) {
    await input.store.releaseCredentialSend(key);
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY so an existing buyer can get a reset link.",
    );
  }
  try {
    const access = accessFor(input.products);
    const primary = access[0];
    if (!primary) {
      throw new Error("Existing-account unlock had no product URL.");
    }
    const resetLink = await createRecoveryLink(admin, email, primary.url, input.fetchImpl);
    const title = access.length === 1 ? primary.title : "Your SOP Mojo products";
    const sent = await sendResendEmail({
      email,
      subject: `${title} is unlocked`,
      text: unlockEmailText({ email, access, resetLink }),
      env: input.env,
      fetchImpl: input.fetchImpl,
    });
    if (!sent) {
      throw new Error("Set RESEND_API_KEY so an existing buyer receives the unlock email.");
    }
    return { createdUser: false, credentials: "sent", mailer: "resend" };
  } catch (error) {
    await input.store.releaseCredentialSend(key);
    throw error;
  }
}

export async function replayExistingAccountUnlock(input: {
  email: string;
  products: string[];
  eventId: string;
  env: NodeJS.ProcessEnv;
  fetchImpl: typeof fetch;
  store: EventStore;
}): Promise<void> {
  const admin = readAdminConfig(input.env);
  if (!admin) return;
  const products = input.products.filter(isEntitlementProduct);
  if (products.length === 0) return;
  const email = input.email.trim().toLowerCase();
  const user = await lookupPayUser(admin, email, input.fetchImpl);
  if (!user || payOwnsCredentials(user.appMetadata, false)) return;
  await sendExistingUnlock({
    email,
    products,
    eventId: input.eventId,
    env: input.env,
    fetchImpl: input.fetchImpl,
    store: input.store,
  });
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

  if (!input.allowCredentials) {
    return { createdUser: created || webhookCreated, credentials: "not_applicable", mailer: null };
  }
  if (user && !payOwnsCredentials(user.appMetadata, created)) {
    const emailed = await sendExistingUnlock({
      email,
      products,
      eventId: input.eventId,
      env: input.env,
      fetchImpl: input.fetchImpl,
      store: input.store,
    });
    return { ...emailed, createdUser: created || webhookCreated };
  }

  const pending = user?.appMetadata?.pay_credentials === "pending" || created;
  const shouldEmail = pending;
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
