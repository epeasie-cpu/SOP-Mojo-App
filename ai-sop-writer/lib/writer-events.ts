import { WRITER_EVENTS_URL } from "./site";

/** Same key the Builder reads when `anon` arrives on a try-Builder link. */
export const ANON_STORAGE_KEY = "sopmojo.anon_id";
export const FIRST_TOUCH_STORAGE_KEY = "sopmojo.writer.first_touch";

export const WRITER_EVENT_NAMES = [
  "writer_page_view",
  "writer_sop_generated",
  "writer_try_builder_click",
] as const;

export type WriterEventName = (typeof WRITER_EVENT_NAMES)[number];

export type FirstTouch = {
  utm_source: string | null;
  utm_campaign: string | null;
  referrer: string | null;
};

export type WriterEventBody = {
  event_name: WriterEventName;
  anonymous_id: string;
  utm_source?: string;
  utm_campaign?: string;
  referrer?: string;
  props: {
    path: string;
    template_slug?: string;
  };
};

export type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UTM_RE = /^[A-Za-z0-9._~+\-]+$/;
const PATH_RE = /^\/[A-Za-z0-9/_:-]*$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Letters, numbers, and . _ ~ + - only. Drops anything that could carry an address. */
export function cleanUtm(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 80) return null;
  if (trimmed.includes("@") || !UTM_RE.test(trimmed)) return null;
  return trimmed;
}

export function cleanEventPath(value: string): string | null {
  const bare = value.trim().split("?")[0]?.split("#")[0] ?? "";
  if (!bare.startsWith("/") || bare.includes("@") || bare.length > 80) return null;
  const scrubbed = bare
    .split("/")
    .map((part) => (isUuid(part) ? ":id" : part))
    .join("/");
  if (!PATH_RE.test(scrubbed)) return null;
  return scrubbed;
}

export function cleanReferrer(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.username || url.password) return null;
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const path = cleanEventPath(url.pathname) ?? "";
    const host = url.host.toLowerCase();
    if (!host || host.length > 120) return null;
    const combined = `${url.protocol}//${host}${path === "/" ? "" : path}`;
    if (combined.includes("@") || combined.length > 180) return null;
    return combined;
  } catch {
    return null;
  }
}

export function cleanTemplateSlug(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed.length > 80 || !SLUG_RE.test(trimmed)) return null;
  return trimmed;
}

/** Last segment of `/sop-templates/<slug>`. The hub itself is not a template. */
export function templateSlugFromPath(path: string): string | null {
  const clean = cleanEventPath(path);
  if (!clean) return null;
  const match = clean.match(/^\/sop-templates\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  return match?.[1] ?? null;
}

export function readOrCreateAnonId(storage: KeyValueStore, createId: () => string = () => crypto.randomUUID()): string {
  const existing = storage.getItem(ANON_STORAGE_KEY);
  if (existing && isUuid(existing)) return existing.toLowerCase();
  const created = createId().toLowerCase();
  if (!isUuid(created)) return created;
  try {
    storage.setItem(ANON_STORAGE_KEY, created);
  } catch {
    // Storage can be blocked. The caller still sends this id once.
  }
  return created;
}

export function readOrCaptureFirstTouch(
  storage: KeyValueStore,
  input: { utmSource: unknown; utmCampaign: unknown; referrer: unknown },
): FirstTouch {
  const raw = storage.getItem(FIRST_TOUCH_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<FirstTouch>;
      return {
        utm_source: cleanUtm(parsed.utm_source),
        utm_campaign: cleanUtm(parsed.utm_campaign),
        referrer: cleanReferrer(parsed.referrer),
      };
    } catch {
      // Replace an unreadable value below.
    }
  }
  const touch: FirstTouch = {
    utm_source: cleanUtm(input.utmSource),
    utm_campaign: cleanUtm(input.utmCampaign),
    referrer: cleanReferrer(input.referrer),
  };
  try {
    storage.setItem(FIRST_TOUCH_STORAGE_KEY, JSON.stringify(touch));
  } catch {
    // The event can still carry this touch for the current call.
  }
  return touch;
}

export function buildWriterEvent(input: {
  eventName: string;
  anonymousId: string;
  touch: FirstTouch;
  path: string;
  templateSlug?: string | null;
}): WriterEventBody | null {
  if (!(WRITER_EVENT_NAMES as readonly string[]).includes(input.eventName)) return null;
  if (!isUuid(input.anonymousId)) return null;
  const path = cleanEventPath(input.path);
  if (!path) return null;
  const templateSlug = cleanTemplateSlug(input.templateSlug);
  const props: WriterEventBody["props"] = templateSlug
    ? { path, template_slug: templateSlug }
    : { path };
  const body: WriterEventBody = {
    event_name: input.eventName as WriterEventName,
    anonymous_id: input.anonymousId.toLowerCase(),
    props,
  };
  const utmSource = cleanUtm(input.touch.utm_source);
  const utmCampaign = cleanUtm(input.touch.utm_campaign);
  const referrer = cleanReferrer(input.touch.referrer);
  if (utmSource) body.utm_source = utmSource;
  if (utmCampaign) body.utm_campaign = utmCampaign;
  if (referrer) body.referrer = referrer;
  return body;
}

/** Keep the existing query, and add the anonymous id. */
export function tryBuilderHref(href: string, anon: string): string {
  if (!isUuid(anon)) return href;
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return href;
  }
  url.searchParams.set("anon", anon.toLowerCase());
  return url.toString();
}

export function postWriterEvent(body: WriterEventBody, fetchImpl: typeof fetch = fetch): void {
  try {
    void Promise.resolve()
      .then(() =>
        fetchImpl(WRITER_EVENTS_URL, {
          method: "POST",
          mode: "cors",
          credentials: "omit",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      )
      .catch(() => undefined);
  } catch {
    // The ingest is not live yet. A 404 or a network error must not surface.
  }
}

function browserStore(): KeyValueStore {
  return {
    getItem(key) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Private mode stays silent.
      }
    },
  };
}

/** Fire-and-forget. Never throws and never waits on the response. */
export function trackWriterEvent(
  eventName: WriterEventName,
  input: { path: string; templateSlug?: string | null },
): void {
  if (typeof window === "undefined") return;
  try {
    const storage = browserStore();
    const anonymousId = readOrCreateAnonId(storage);
    const params = new URLSearchParams(window.location.search);
    const touch = readOrCaptureFirstTouch(storage, {
      utmSource: params.get("utm_source"),
      utmCampaign: params.get("utm_campaign"),
      referrer: document.referrer,
    });
    const body = buildWriterEvent({
      eventName,
      anonymousId,
      touch,
      path: input.path,
      templateSlug: input.templateSlug,
    });
    if (!body) return;
    postWriterEvent(body);
  } catch {
    // Analytics must not affect the page.
  }
}

export function stampTryBuilderLinks(): void {
  if (typeof document === "undefined") return;
  try {
    const anon = readOrCreateAnonId(browserStore());
    document.querySelectorAll("a[data-try-builder]").forEach((node) => {
      if (!(node instanceof HTMLAnchorElement)) return;
      const href = node.getAttribute("href");
      if (!href) return;
      const next = tryBuilderHref(href, anon);
      if (next !== href) node.setAttribute("href", next);
    });
  } catch {
    // Leave the server-rendered UTMs in place.
  }
}
