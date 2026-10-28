import { CPT_KIT_PAGE_URL } from "./cpt-kit-page";
import { QC_PACK_CHECK_URL } from "./qc-pack-page";

export const LEAD_POPUP_SNIPPET =
  '<script src="https://pay.sopmojo.com/embed/lead-popup.js" data-offer="qc-pack" data-paths="/articles/quality-management-software" defer></script>';

export const LEAD_POPUP_OFFERS = {
  "qc-pack": {
    headline: "Free Quality Control Starter Pack",
    body: "Five Google Docs and Sheets you copy: a one-week start, an inspection checklist, a nonconformance and CAPA log, a quality KPI tracker, and an SOP review log.",
    button: "Send me the pack",
    secondary: "Or take the 2-minute QMS check",
    secondaryHref: QC_PACK_CHECK_URL,
    endpoint: "https://pay.sopmojo.com/api/lead/qc-pack",
    success: "Check your inbox",
    error: "We could not send the pack. Try again in a minute.",
  },
  "cpt-kit": {
    headline: "Free 2027 SLP CPT Kit",
    body: "CPT 92507 is deleted after 12/31/2026. Job aid and a calculator for your own rates.",
    button: "Email me the kit",
    secondary: "Educational, not billing advice",
    secondaryHref: CPT_KIT_PAGE_URL,
    endpoint: "https://pay.sopmojo.com/api/lead/cpt-kit",
    success: "Check your inbox",
    error: "We could not send the kit. Try again in a minute.",
  },
} as const;

const EXACT_ORIGINS = new Set(["https://www.sopmojo.com", "https://sopmojo.com"]);

/** Exact path, or a prefix when the pattern ends in *. A lone * matches every path. */
export function leadPopupPathMatches(pathname: string, patterns: string): boolean {
  const clean = (value: string): string => {
    const noHash = value.split("#")[0] ?? "";
    const noQuery = noHash.split("?")[0] ?? "";
    const trimmed = noQuery.trim() || "/";
    const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    if (withSlash.length > 1 && withSlash.endsWith("/")) return withSlash.slice(0, -1);
    return withSlash;
  };
  const path = clean(pathname);
  return patterns.split(",").some((raw) => {
    const pattern = raw.trim();
    if (!pattern) return false;
    if (pattern === "*") return true;
    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1);
      return prefix.length > 0 && path.startsWith(prefix);
    }
    return path === clean(pattern);
  });
}

/** Browser Origin values allowed to call the lead API. */
export function leadPopupAllowedOrigin(origin: string): string | null {
  const value = origin.trim();
  if (EXACT_ORIGINS.has(value)) return value;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.origin !== value) return null;
  const host = url.hostname;
  if (host === "framer.app" || host.endsWith(".framer.app")) return value;
  if (host === "framer.website" || host.endsWith(".framer.website")) return value;
  return null;
}

export function leadPopupScript(): string {
  return `(function () {
  var OFFERS = ${JSON.stringify(LEAD_POPUP_OFFERS)};
  var pathMatches = ${leadPopupPathMatches.toString()};
  var current = document.currentScript;
  if (!current) {
    var scripts = document.querySelectorAll("script[src*='lead-popup.js']");
    current = scripts[scripts.length - 1] || null;
  }
  if (!current || !document.body) return;
  var offerId = current.getAttribute("data-offer") || "";
  var offer = OFFERS[offerId];
  var patterns = current.getAttribute("data-paths") || "";
  if (!offer || !pathMatches(location.pathname, patterns)) return;
  var key = "sopmojo-lead:" + offerId;
  var opened = false;
  var submitted = false;
  function remembered() {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return false;
      var data = JSON.parse(raw);
      return !!(data && data.until > Date.now());
    } catch (error) {
      return false;
    }
  }
  function remember(kind) {
    var days = kind === "submit" ? 365 : 7;
    try {
      localStorage.setItem(key, JSON.stringify({ kind: kind, until: Date.now() + days * 86400000 }));
    } catch (error) {}
  }
  function focusable(root) {
    return Array.prototype.slice.call(root.querySelectorAll("button, a[href], input")).filter(function (el) {
      return !el.disabled && el.tabIndex !== -1 && el.getAttribute("aria-hidden") !== "true" && !el.hidden && !el.closest("[hidden]");
    });
  }
  function openCard(force) {
    if (opened) return;
    if (!force && remembered()) return;
    opened = true;
    var previous = document.activeElement;
    var style = document.createElement("style");
    style.textContent = ".sop-lead-root button,.sop-lead-root input,.sop-lead-root a{all:unset;box-sizing:border-box}.sop-lead-root,.sop-lead-root *{box-sizing:border-box}.sop-lead-root{all:initial;box-sizing:border-box;display:block;position:fixed;z-index:2147483000;right:16px;bottom:16px;width:min(360px,calc(100vw - 32px));max-height:35vh;overflow:auto;background:#0C0E0C;color:#f4f4f5;border:1px solid #3f3f46;border-radius:12px;padding:16px;font-family:\\"Open Sans\\",sans-serif;font-size:14px;line-height:1.4;box-shadow:0 12px 40px rgba(0,0,0,.35);animation:sop-lead-in .28s ease-out}.sop-lead-root .sop-lead-close{position:absolute;top:8px;right:8px;width:32px;height:32px;border:0;background:transparent;color:#f4f4f5;font-size:20px;line-height:32px;text-align:center;cursor:pointer}.sop-lead-root .sop-lead-title{display:block;margin:0 36px 8px 0;font-family:\\"Space Grotesk\\",sans-serif;font-size:18px;font-weight:650;color:#f4f4f5}.sop-lead-root .sop-lead-body{display:block;margin:0 0 12px;color:#d4d4d8}.sop-lead-root .sop-lead-label{display:block;margin:8px 0 4px;color:#e4e4e7;font-size:13px}.sop-lead-root .sop-lead-input{display:block;width:100%;min-height:40px;border:1px solid #3f3f46;border-radius:4px;background:#18181b;color:#f4f4f5;padding:8px}.sop-lead-root .sop-lead-button{display:flex;width:100%;min-height:44px;margin-top:12px;align-items:center;justify-content:center;border:0;border-radius:4px;background:#C1FF72;color:#0C0E0C;font-weight:700;cursor:pointer}.sop-lead-root .sop-lead-link{display:block;margin-top:10px;color:#C1FF72;text-align:center;text-decoration:underline}.sop-lead-root .sop-lead-error{display:block;margin-top:8px;color:#fca5a5;font-size:13px}.sop-lead-root .sop-lead-success{display:block;margin:12px 0 0;font-weight:700}.sop-lead-root .sop-lead-honey{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}@media (max-width:640px){.sop-lead-root{left:0;right:0;bottom:0;width:100%;border-radius:16px 16px 0 0}}@media (prefers-reduced-motion:reduce){.sop-lead-root{animation:none}}@keyframes sop-lead-in{from{transform:translateY(12px);opacity:0}to{transform:none;opacity:1}}";
    document.head.appendChild(style);
    var root = document.createElement("div");
    root.className = "sop-lead-root";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "sop-lead-title");
    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "sop-lead-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "\\u00d7";
    var title = document.createElement("div");
    title.id = "sop-lead-title";
    title.className = "sop-lead-title";
    title.textContent = offer.headline;
    var body = document.createElement("p");
    body.className = "sop-lead-body";
    body.textContent = offer.body;
    var form = document.createElement("form");
    var honeyWrap = document.createElement("div");
    honeyWrap.className = "sop-lead-honey";
    honeyWrap.setAttribute("aria-hidden", "true");
    var honey = document.createElement("input");
    honey.name = "company";
    honey.type = "text";
    honey.tabIndex = -1;
    honey.autocomplete = "off";
    honeyWrap.appendChild(honey);
    function field(id, labelText, type, auto) {
      var label = document.createElement("label");
      label.className = "sop-lead-label";
      label.htmlFor = id;
      label.textContent = labelText;
      var input = document.createElement("input");
      input.id = id;
      input.name = type === "email" ? "email" : "name";
      input.type = type;
      input.required = true;
      input.autocomplete = auto;
      input.className = "sop-lead-input";
      form.appendChild(label);
      form.appendChild(input);
      return input;
    }
    form.appendChild(honeyWrap);
    field("sop-lead-name", "Name", "text", "name");
    field("sop-lead-email", "Email", "email", "email");
    var error = document.createElement("p");
    error.className = "sop-lead-error";
    error.setAttribute("role", "alert");
    var button = document.createElement("button");
    button.type = "submit";
    button.className = "sop-lead-button";
    button.textContent = offer.button;
    form.appendChild(error);
    form.appendChild(button);
    var secondary = document.createElement("a");
    secondary.className = "sop-lead-link";
    secondary.href = offer.secondaryHref;
    secondary.textContent = offer.secondary;
    var success = document.createElement("p");
    success.className = "sop-lead-success";
    success.tabIndex = -1;
    success.hidden = true;
    success.textContent = offer.success;
    root.appendChild(closeBtn);
    root.appendChild(title);
    root.appendChild(body);
    root.appendChild(form);
    root.appendChild(secondary);
    root.appendChild(success);
    document.body.appendChild(root);
    function onKey(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      var items = focusable(root);
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    function close() {
      if (!submitted) remember("dismiss");
      document.removeEventListener("keydown", onKey);
      root.remove();
      if (previous && previous.focus) previous.focus();
    }
    document.addEventListener("keydown", onKey);
    closeBtn.addEventListener("click", close);
    closeBtn.focus();
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      error.textContent = "";
      button.disabled = true;
      var data = new FormData(form);
      fetch(offer.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(data.get("name") || ""),
          email: String(data.get("email") || ""),
          company: String(data.get("company") || ""),
          source: "popup"
        })
      }).then(function (response) {
        return response.json().then(function (payload) {
          return { ok: response.ok && payload && payload.ok === true };
        });
      }).then(function (result) {
        button.disabled = false;
        if (!result.ok) {
          error.textContent = offer.error;
          return;
        }
        submitted = true;
        remember("submit");
        form.hidden = true;
        secondary.hidden = true;
        success.hidden = false;
        success.focus();
      }).catch(function () {
        button.disabled = false;
        error.textContent = offer.error;
      });
    });
  }
  var force = /(?:^|[?&])force=1(?:&|$)/.test(location.search);
  window.addEventListener("scroll", function () {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (max > 0 && window.scrollY / max >= 0.5) openCard(false);
  }, { passive: true });
  document.addEventListener("mouseout", function (event) {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (event.clientY > 0 || event.relatedTarget) return;
    openCard(false);
  });
  if (force) openCard(true);
})();
`;
}
