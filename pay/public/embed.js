(function () {
  var MOTION_MS = 280;
  var READY_FALLBACK_MS = 2000;
  var script = document.currentScript;
  var origin = "https://pay.sopmojo.com";
  if (script && script.src) {
    try {
      origin = new URL(script.src).origin;
    } catch {
      origin = "https://pay.sopmojo.com";
    }
  }

  var products = {};
  var inflight = {};

  function motionMs() {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return reduce ? 0 : MOTION_MS;
  }

  function slugFrom(href) {
    try {
      var url = new URL(href, window.location.href);
      if (url.origin !== origin) return null;
      var match = url.pathname.match(/^\/go\/([^/]+)\/?$/);
      return match ? decodeURIComponent(match[1]) : null;
    } catch {
      return null;
    }
  }

  function checkoutHref(slug, embed) {
    var info = products[slug];
    var id = (info && info.id) || slug;
    var path = origin + "/checkout/" + encodeURIComponent(id);
    return embed ? path + "?embed=1" : path;
  }

  function hint(rel, href, as, cross) {
    if (!document.head) return;
    var link = document.createElement("link");
    link.rel = rel;
    link.href = href;
    if (as) link.as = as;
    // Stripe.js injects clover/stripe.js with no crossorigin attribute. A preload
    // must match that mode or the browser downloads the script twice.
    if (cross) link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  }

  function connect() {
    hint("preconnect", origin, "", false);
    // No crossorigin: Stripe.js injects clover/stripe.js as a no-cors script. A parent
    // preload does not satisfy that iframe request and downloads the file twice.
    hint("preconnect", "https://js.stripe.com", "", false);
    hint("preconnect", "https://api.stripe.com", "", true);
  }

  function constrainedNetwork() {
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return false;
    if (conn.saveData) return true;
    var type = String(conn.effectiveType || "");
    return type === "slow-2g" || type === "2g" || type === "3g";
  }

  function ensureStyle() {
    if (document.getElementById("sop-pay-style")) return;
    var style = document.createElement("style");
    style.id = "sop-pay-style";
    style.textContent = [
      "#sop-pay-panel{position:fixed;inset:0;z-index:2147483000;display:flex;justify-content:flex-end;}",
      ".sop-pay-overlay{position:absolute;inset:0;background:rgba(0,0,0,.62);opacity:0;transition:opacity 280ms ease-out;}",
      ".sop-pay-aside{position:relative;background:#09090b;width:min(100%,28rem);height:100%;display:flex;flex-direction:column;box-shadow:0 0 40px rgba(0,0,0,.45);transform:translate3d(100%,0,0);transition:transform 280ms ease-out;}",
      "#sop-pay-panel.is-open .sop-pay-overlay{opacity:1;}",
      "#sop-pay-panel.is-open .sop-pay-aside{transform:translate3d(0,0,0);}",
      ".sop-pay-bar{display:flex;justify-content:flex-end;padding:8px;}",
      ".sop-pay-close{min-height:48px;min-width:48px;padding:0 16px;background:#b0ff56;color:#10140c;border:0;font:600 16px/1 system-ui,sans-serif;cursor:pointer;}",
      ".sop-pay-stage{position:relative;flex:1;min-height:0;display:flex;flex-direction:column;background:#09090b;}",
      ".sop-pay-frame{border:0;flex:1;width:100%;height:100%;background:#09090b;}",
      ".sop-pay-skeleton{position:absolute;inset:0;display:flex;flex-direction:column;gap:16px;padding:24px;background:#09090b;color:#f4f4f5;font:16px/1.4 system-ui,sans-serif;}",
      ".sop-pay-skeleton[hidden]{display:none;}",
      ".sop-pay-progress{height:4px;background:#27272a;overflow:hidden;border-radius:999px;}",
      ".sop-pay-progress > span{display:block;height:100%;width:40%;background:#b0ff56;animation:sop-pay-progress 1s ease-in-out infinite;}",
      ".sop-pay-title{margin:12px 0 0;font:600 28px/1.15 Georgia,serif;}",
      ".sop-pay-price{margin:8px 0 0;font:600 22px/1.2 system-ui,sans-serif;color:#b0ff56;}",
      "@keyframes sop-pay-progress{0%{transform:translateX(-120%);}100%{transform:translateX(320%);}}",
      "@media (prefers-reduced-motion: reduce){",
      ".sop-pay-overlay,.sop-pay-aside{transition:none;}",
      ".sop-pay-progress > span{animation:none;width:100%;}",
      "}",
      ".sop-pay-parked{position:fixed;inset:0;z-index:2147483000;display:flex;justify-content:flex-end;visibility:hidden;pointer-events:none;}",
    ].join("");
    document.head.appendChild(style);
  }

  function paintSkeleton(panel, slug) {
    var info = products[slug];
    var title = panel.querySelector("[data-skeleton-title]");
    var price = panel.querySelector("[data-skeleton-price]");
    if (title) title.textContent = info && info.title ? info.title : "Checkout";
    if (price) price.textContent = info && info.priceLabel ? info.priceLabel : "";
  }

  function reveal(panel) {
    if (!panel || panel.getAttribute("data-state") === "ready") return;
    panel.setAttribute("data-state", "ready");
    var skeleton = panel.querySelector(".sop-pay-skeleton");
    if (skeleton) skeleton.hidden = true;
  }

  function scheduleFallback(frame) {
    window.setTimeout(function () {
      var panel = document.getElementById("sop-pay-panel");
      if (panel && panel.contains(frame)) reveal(panel);
    }, READY_FALLBACK_MS);
  }

  function shellFor(slug) {
    var id = (products[slug] && products[slug].id) || slug;
    var existing = document.querySelector('iframe.sop-pay-frame[data-slug="' + id + '"]');
    if (existing) {
      var shell = existing.closest(".sop-pay-parked, #sop-pay-panel");
      if (shell) return shell;
    }
    var info = products[slug];
    var panel = document.createElement("div");
    panel.className = "sop-pay-parked";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", info && info.title ? info.title : "Checkout");
    panel.setAttribute("data-state", "loading");
    panel.setAttribute("data-slug", id);
    panel.innerHTML =
      '<div class="sop-pay-overlay"></div>' +
      '<div class="sop-pay-aside">' +
      '<div class="sop-pay-bar"><button type="button" class="sop-pay-close">Close</button></div>' +
      '<div class="sop-pay-stage">' +
      '<div class="sop-pay-skeleton" role="status">' +
      '<div class="sop-pay-progress" aria-hidden="true"><span></span></div>' +
      '<p class="sop-pay-title" data-skeleton-title>Checkout</p>' +
      '<p class="sop-pay-price" data-skeleton-price></p>' +
      "</div></div></div>";
    paintSkeleton(panel, slug);
    var close = panel.querySelector(".sop-pay-close");
    if (close) close.addEventListener("click", function () { closePanel(false); });
    var overlay = panel.querySelector(".sop-pay-overlay");
    if (overlay) overlay.addEventListener("click", function () { closePanel(false); });
    var frame = document.createElement("iframe");
    frame.className = "sop-pay-frame";
    frame.setAttribute("data-slug", id);
    frame.title = "SOP Mojo checkout";
    frame.allow = "payment";
    frame.addEventListener("load", function () {
      frame.setAttribute("data-loaded", "1");
      scheduleFallback(frame);
    });
    var stage = panel.querySelector(".sop-pay-stage");
    if (stage) stage.appendChild(frame);
    document.body.appendChild(panel);
    frame.src = checkoutHref(slug, true);
    return panel;
  }

  function preloadFrame(slug, automatic) {
    if (automatic && constrainedNetwork()) return;
    var info = products[slug];
    if (info && info.presentation && info.presentation !== "panel") return;
    shellFor(slug);
  }

  function park(panel) {
    if (!panel || !panel.isConnected) return;
    panel.classList.remove("is-open");
    panel.classList.add("sop-pay-parked");
    panel.removeAttribute("id");
    panel.removeAttribute("data-closing");
    if (!document.getElementById("sop-pay-panel")) document.body.style.overflow = "";
  }

  function closePanel(immediate) {
    var panel = document.getElementById("sop-pay-panel");
    if (!panel || panel.getAttribute("data-closing") === "1") return;
    panel.setAttribute("data-closing", "1");
    panel.classList.remove("is-open");
    var ms = immediate ? 0 : motionMs();
    if (ms === 0) {
      park(panel);
      return;
    }
    var done = false;
    var finish = function () {
      if (done) return;
      done = true;
      park(panel);
    };
    var aside = panel.querySelector(".sop-pay-aside");
    if (aside) aside.addEventListener("transitionend", finish);
    window.setTimeout(finish, ms + 50);
  }

  function openPanel(slug) {
    ensureStyle();
    var info = products[slug];
    var id = (info && info.id) || slug;
    var current = document.getElementById("sop-pay-panel");
    if (current && current.getAttribute("data-slug") !== id) park(current);
    var panel = shellFor(slug);
    if (panel.id === "sop-pay-panel" && panel.classList.contains("is-open")) return;
    panel.id = "sop-pay-panel";
    panel.classList.remove("sop-pay-parked");
    panel.removeAttribute("data-closing");
    document.body.style.overflow = "hidden";
    var frame = panel.querySelector("iframe.sop-pay-frame");
    if (frame && frame.getAttribute("data-ready") === "1") reveal(panel);
    else if (frame && frame.getAttribute("data-loaded") === "1") scheduleFallback(frame);
    if (motionMs() === 0) {
      panel.classList.add("is-open");
      return;
    }
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        if (panel.isConnected) panel.classList.add("is-open");
      });
    });
  }

  function remember(slug, product) {
    products[slug] = product;
    if (product.id && product.id !== slug) products[product.id] = product;
    var panel = document.getElementById("sop-pay-panel");
    var id = product.id || slug;
    if (panel && panel.getAttribute("data-slug") === id) {
      if (product.presentation && product.presentation !== "panel") {
        window.location.href = checkoutHref(slug, false);
        return;
      }
      paintSkeleton(panel, slug);
      var label = panel.querySelector("[data-skeleton-title]");
      if (label && product.title) panel.setAttribute("aria-label", product.title);
    }
    if (!product.presentation || product.presentation === "panel") preloadFrame(slug, true);
  }

  function ensureProduct(slug) {
    if (products[slug] || inflight[slug]) return inflight[slug] || Promise.resolve(products[slug]);
    inflight[slug] = fetch(origin + "/api/products/" + encodeURIComponent(slug))
      .then(function (response) {
        if (!response.ok) throw new Error("product");
        return response.json();
      })
      .then(function (product) {
        remember(slug, product);
        return product;
      })
      .catch(function () {
        return null;
      })
      .then(function (product) {
        delete inflight[slug];
        return product;
      });
    return inflight[slug];
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== origin || event.data !== "ready") return;
    var frames = document.querySelectorAll("iframe.sop-pay-frame");
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].contentWindow !== event.source) continue;
      frames[i].setAttribute("data-ready", "1");
      var panel = document.getElementById("sop-pay-panel");
      if (panel && panel.contains(frames[i])) reveal(panel);
      if (window.top && window.top !== window) {
        try {
          window.top.postMessage("ready", "*");
        } catch {
          /* a top window that cannot be posted to still leaves this frame's listener intact */
        }
      }
    }
  });

  function watchLink(link) {
    if (link.getAttribute("data-sop-pay") === "1") return;
    var slug = slugFrom(link.href);
    if (!slug) return;
    link.setAttribute("data-sop-pay", "1");
    if (!constrainedNetwork()) ensureProduct(slug);
    var warm = function () {
      ensureProduct(slug);
      preloadFrame(slug, false);
    };
    link.addEventListener("pointerenter", warm);
    link.addEventListener("focus", warm);
  }

  function collect() {
    var links = document.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) watchLink(links[i]);
  }

  document.addEventListener(
    "click",
    function (event) {
      var node = event.target;
      if (!node || !node.closest) return;
      var link = node.closest("a");
      if (!link || !link.href) return;
      var slug = slugFrom(link.href);
      if (!slug) return;
      event.preventDefault();
      var known = products[slug];
      if (known && known.presentation && known.presentation !== "panel") {
        window.location.href = checkoutHref(slug, false);
        return;
      }
      ensureProduct(slug);
      openPanel(slug);
    },
    true,
  );

  function boot() {
    connect();
    ensureStyle();
    collect();
    var idle = function () { collect(); };
    if (window.requestIdleCallback) window.requestIdleCallback(idle, { timeout: 300 });
    else window.setTimeout(idle, 300);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  window.addEventListener("load", collect);
})();
