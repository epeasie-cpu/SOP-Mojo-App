import { describe, expect, it, vi } from "vitest";
import { builderTryUrl, WRITER_EVENTS_URL } from "@/lib/site";
import {
  ANON_STORAGE_KEY,
  FIRST_TOUCH_STORAGE_KEY,
  buildWriterEvent,
  cleanReferrer,
  postWriterEvent,
  readOrCaptureFirstTouch,
  readOrCreateAnonId,
  templateSlugFromPath,
  tryBuilderHref,
  type KeyValueStore,
  type WriterEventBody,
} from "@/lib/writer-events";

function memoryStore(seed: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...seed };
  return {
    data,
    getItem(key) {
      return data[key] ?? null;
    },
    setItem(key, value) {
      data[key] = value;
    },
  };
}

const anon = "8b1b2c3d-4e5f-4678-89ab-0c1d2e3f4a5b";

describe("writer event payload", () => {
  it("matches the ingest shape and keeps the template slug off the SOP text", () => {
    const body = buildWriterEvent({
      eventName: "writer_sop_generated",
      anonymousId: anon.toUpperCase(),
      touch: {
        utm_source: "google",
        utm_campaign: "free-trial",
        referrer: "https://www.google.com/search?q=sop+template&email=ada@example.com",
      },
      path: "/sop-templates/restaurant-sop-template?process=Kitchen%20opening",
      templateSlug: "restaurant-sop-template",
    });
    expect(body).toEqual({
      event_name: "writer_sop_generated",
      anonymous_id: anon,
      utm_source: "google",
      utm_campaign: "free-trial",
      referrer: "https://www.google.com/search",
      props: {
        path: "/sop-templates/restaurant-sop-template",
        template_slug: "restaurant-sop-template",
      },
    });
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("@");
    expect(serialized).not.toContain("Kitchen opening");
    expect(serialized).not.toContain("purpose");
    expect(serialized).not.toContain("steps");
  });

  it("omits the template slug away from a template page", () => {
    const body = buildWriterEvent({
      eventName: "writer_page_view",
      anonymousId: anon,
      touch: { utm_source: null, utm_campaign: null, referrer: null },
      path: "/faq",
      templateSlug: templateSlugFromPath("/faq"),
    });
    expect(body?.props).toEqual({ path: "/faq" });
    expect(body).not.toHaveProperty("utm_source");
    expect(templateSlugFromPath("/sop-templates")).toBeNull();
    expect(templateSlugFromPath("/sop-templates/payroll-sop-template")).toBe("payroll-sop-template");
  });

  it("drops an unknown event name and a dirty utm", () => {
    expect(
      buildWriterEvent({
        eventName: "signup",
        anonymousId: anon,
        touch: { utm_source: null, utm_campaign: null, referrer: null },
        path: "/",
      }),
    ).toBeNull();
    expect(cleanReferrer("not a url")).toBeNull();
    const body = buildWriterEvent({
      eventName: "writer_try_builder_click",
      anonymousId: anon,
      touch: { utm_source: "ada@example.com", utm_campaign: "spring sale", referrer: null },
      path: "/sop-templates/hr-sop-template",
      templateSlug: "hr-sop-template",
    });
    expect(body?.utm_source).toBeUndefined();
    expect(body?.utm_campaign).toBeUndefined();
  });
});

describe("anonymous id and first touch", () => {
  it("stores one uuid and does not replace the first campaign", () => {
    const store = memoryStore();
    const first = readOrCreateAnonId(store, () => anon);
    const second = readOrCreateAnonId(store, () => "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee");
    expect(first).toBe(anon);
    expect(second).toBe(anon);
    expect(store.data[ANON_STORAGE_KEY]).toBe(anon);

    const touch = readOrCaptureFirstTouch(store, {
      utmSource: "newsletter",
      utmCampaign: "march",
      referrer: "https://www.sopmojo.com/blog/sop",
    });
    const later = readOrCaptureFirstTouch(store, {
      utmSource: "ads",
      utmCampaign: "april",
      referrer: "https://www.google.com/",
    });
    expect(later).toEqual(touch);
    expect(JSON.parse(store.data[FIRST_TOUCH_STORAGE_KEY] ?? "")).toMatchObject({
      utm_source: "newsletter",
      utm_campaign: "march",
    });
  });
});

describe("try Builder links", () => {
  it("appends anon without dropping the existing UTMs", () => {
    const href = builderTryUrl("restaurant-sop-template");
    const linked = tryBuilderHref(href, anon);
    const url = new URL(linked);
    expect(url.pathname).toBe("/try");
    expect(url.searchParams.get("anon")).toBe(anon);
    expect(url.searchParams.get("utm_source")).toBe("ai-sop-writer");
    expect(url.searchParams.get("utm_medium")).toBe("product");
    expect(url.searchParams.get("utm_campaign")).toBe("writer_to_builder");
    expect(url.searchParams.get("utm_content")).toBe("restaurant-sop-template");
    expect(linked.toLowerCase()).not.toContain("samcart");
  });
});

describe("ingest post", () => {
  it("posts to the one events URL and ignores 404s and thrown fetches", async () => {
    const body: WriterEventBody = {
      event_name: "writer_page_view",
      anonymous_id: anon,
      props: { path: "/" },
    };
    const missing = vi.fn(async () => new Response("missing", { status: 404 }));
    postWriterEvent(body, missing as typeof fetch);
    await Promise.resolve();
    expect(missing).toHaveBeenCalledTimes(1);
    const call = missing.mock.calls[0] as unknown as [string, RequestInit];
    expect(call[0]).toBe(WRITER_EVENTS_URL);
    expect(WRITER_EVENTS_URL).toBe("https://builder.sopmojo.com/api/events");
    const sent = JSON.parse(String(call[1].body));
    expect(sent).toEqual(body);

    const exploded = vi.fn(async () => {
      throw new Error("offline");
    });
    expect(() => postWriterEvent(body, exploded as typeof fetch)).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
    expect(exploded).toHaveBeenCalled();
  });
});
