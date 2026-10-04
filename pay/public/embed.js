(function () {
  var script = document.currentScript;
  var origin = "https://pay.sopmojo.com";
  if (script && script.src) {
    try {
      origin = new URL(script.src).origin;
    } catch {
      origin = "https://pay.sopmojo.com";
    }
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

  function closePanel() {
    var panel = document.getElementById("sop-pay-panel");
    if (panel) panel.remove();
    document.body.style.overflow = "";
  }

  function openPanel(url) {
    closePanel();
    var root = document.createElement("div");
    root.id = "sop-pay-panel";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Checkout");
    root.style.cssText =
      "position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.62);display:flex;justify-content:flex-end;";
    var aside = document.createElement("div");
    aside.style.cssText =
      "background:#09090b;width:min(100%,28rem);height:100%;display:flex;flex-direction:column;box-shadow:0 0 40px rgba(0,0,0,.45);";
    var bar = document.createElement("div");
    bar.style.cssText = "display:flex;justify-content:flex-end;padding:8px;";
    var close = document.createElement("button");
    close.type = "button";
    close.textContent = "Close";
    close.style.cssText =
      "min-height:48px;min-width:48px;padding:0 16px;background:#b0ff56;color:#10140c;border:0;font:600 16px/1 system-ui,sans-serif;cursor:pointer;";
    close.addEventListener("click", closePanel);
    var frame = document.createElement("iframe");
    frame.src = url;
    frame.title = "SOP Mojo checkout";
    frame.style.cssText = "border:0;flex:1;width:100%;background:#09090b;";
    bar.appendChild(close);
    aside.appendChild(bar);
    aside.appendChild(frame);
    root.appendChild(aside);
    root.addEventListener("click", function (event) {
      if (event.target === root) closePanel();
    });
    document.body.appendChild(root);
    document.body.style.overflow = "hidden";
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
      fetch(origin + "/api/products/" + encodeURIComponent(slug))
        .then(function (response) {
          if (!response.ok) throw new Error("product");
          return response.json();
        })
        .then(function (product) {
          var checkout = origin + "/checkout/" + encodeURIComponent(product.id || slug);
          if (product.presentation === "panel") openPanel(checkout + "?embed=1");
          else window.location.href = checkout;
        })
        .catch(function () {
          window.location.href = link.href;
        });
    },
    true,
  );
})();
