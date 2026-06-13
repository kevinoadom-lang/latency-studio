/* =========================================================================
   Latency — shared roster data + model-preview interstitial
   Single source of truth for character data, used by both index.html
   (home roster) and roster.html (full roster).

   Per-model URLs: opening a model sets the hash to #model/<key>, e.g.
   index.html#model/aoki  or  roster.html#model/hana — shareable + linkable.
   Any element with [data-char="<key>"] opens that model's preview on click.
   ========================================================================= */
(function () {
  "use strict";

  var CHARACTERS = {
    akol: {
      name: "Akol", src: "processed/Akol.png", headshot: "processed/Akol%20Headshot.png", tier: "sig",
      specs: { Height: "5'11\"", Ethnicity: "South Sudanese", Hair: "Shaved", Eyes: "Dark brown", Build: "Tall lean angular" },
      tags: ["High fashion", "Editorial", "Campaign", "Avant-garde"],
      priceStock: { usd: "From $800 / drop", gbp: "From £600 / drop", eur: "From €750 / drop" },
      priceSig: { usd: "From $1,950 / season", gbp: "From £1,500 / season", eur: "From €1,800 / season" }
    },
    eli: {
      name: "Eli", src: "processed/Eli.png", headshot: "processed/Eli%20Headshot.png", tier: "stock",
      specs: { Height: "6'0\"", Ethnicity: "Mixed heritage", Hair: "Short fade", Eyes: "Dark brown", Build: "Athletic natural" },
      tags: ["Streetwear", "Outerwear", "Accessories", "Menswear"],
      priceStock: { usd: "From $800 / drop", gbp: "From £600 / drop", eur: "From €750 / drop" },
      priceSig: { usd: "From $1,950 / season", gbp: "From £1,500 / season", eur: "From €1,800 / season" }
    },
    hana: {
      name: "Hana", src: "processed/Hana.png", headshot: "processed/Hana%20Headshot.png", tier: "sig",
      specs: { Height: "5'6\"", Ethnicity: "East Asian", Hair: "Blunt bob", Eyes: "Dark brown", Build: "Slim precise" },
      tags: ["High fashion", "Editorial", "Contemporary", "Japanese brands"],
      priceStock: { usd: "From $800 / drop", gbp: "From £600 / drop", eur: "From €750 / drop" },
      priceSig: { usd: "From $1,950 / season", gbp: "From £1,500 / season", eur: "From €1,800 / season" }
    },
    nadia: {
      name: "Nadia", src: "processed/Nadia.png", headshot: "processed/Nadia%20Headshot.png", tier: "sig",
      specs: { Height: "5'8\"", Ethnicity: "Italian/Algerian", Hair: "Dark brown", Eyes: "Dark brown", Build: "Tall lean" },
      tags: ["Elevated basics", "Outerwear", "Jewellery", "Lifestyle"],
      priceStock: { usd: "From $800 / drop", gbp: "From £600 / drop", eur: "From €750 / drop" },
      priceSig: { usd: "From $1,950 / season", gbp: "From £1,500 / season", eur: "From €1,800 / season" }
    },
    ade: {
      name: "Ade", src: "processed/Ade.png", headshot: "processed/Ade%20Headshot.png", tier: "sig",
      specs: { Height: "6'1\"", Ethnicity: "Black American", Hair: "Thick mature locs", Eyes: "Dark brown", Build: "Lean athletic" },
      tags: ["High fashion", "Streetwear", "Editorial", "Campaign"],
      priceStock: { usd: "From $800 / drop", gbp: "From £600 / drop", eur: "From €750 / drop" },
      priceSig: { usd: "From $1,950 / season", gbp: "From £1,500 / season", eur: "From €1,800 / season" }
    },
    caspar: {
      name: "Caspar", src: "processed/Caspar.png", headshot: "processed/Caspar%20Headshot.png", tier: "stock",
      specs: { Height: "6'2\"", Ethnicity: "Scandinavian", Hair: "Buzz cut dark brown", Eyes: "Blue-grey", Build: "Tall lean" },
      tags: ["Technical outerwear", "Contemporary menswear", "Scandinavian brands", "Lifestyle"],
      priceStock: { usd: "From $800 / drop", gbp: "From £600 / drop", eur: "From €750 / drop" },
      priceSig: { usd: "From $1,950 / season", gbp: "From £1,500 / season", eur: "From €1,800 / season" }
    }
  };
  var ORDER = ["akol", "eli", "hana", "nadia", "ade", "caspar"];

  function tierLabel(t) { return t === "sig" ? "Signature" : "Essential"; }
  function tierClass(t) { return t === "sig" ? "tier--sig" : "tier--stock"; }
  function specRows(specs) {
    var html = "";
    for (var k in specs) { if (specs.hasOwnProperty(k)) {
      html += "<div><dt>" + k + "</dt><dd>" + specs[k] + "</dd></div>";
    }}
    return html;
  }

  /* Expose for inline page scripts (e.g. roster.html grid builder). */
  window.LATENCY_ROSTER = { CHARACTERS: CHARACTERS, ORDER: ORDER };
  window.CHARACTERS = CHARACTERS;
  window.ORDER = ORDER;
  window.tierLabel = tierLabel;
  window.tierClass = tierClass;
  window.specRows = specRows;

  /* ---- Model-preview interstitial + hash routing ---- */
  function initProfile() {
    var profile = document.getElementById("profile");
    if (!profile) return;  // page has no interstitial markup

    var pfImg     = document.getElementById("pfImg"),
        pfImgHead = document.getElementById("pfImgHead"),
        pfName    = document.getElementById("pfName"),
        pfTier    = document.getElementById("pfTier"),
        pfSpec    = document.getElementById("pfSpec"),
        pfTags    = document.getElementById("pfTags"),
        pfPricing = document.getElementById("pfPricing"),
        pfAvail   = document.getElementById("pfAvail"),
        pfBook    = document.getElementById("pfBook"),
        pfClose   = document.getElementById("profileClose");
    var lastFocus = null;

    /* Outfit ↔ headshot carousel inside the profile image panel */
    var pfCar = document.getElementById("pfCarousel");
    var pfTrack = pfCar ? pfCar.querySelector(".carousel__track") : null;
    var pfDots = document.querySelectorAll("#pfDots .carousel__dot");
    var pfIdx = 0;
    function pfSetIndex(i) {
      pfIdx = Math.max(0, Math.min(1, i));
      if (pfTrack) pfTrack.style.transform = "translateX(" + (-pfIdx * 50) + "%)";
      pfDots.forEach(function (d, di) { d.classList.toggle("is-active", di === pfIdx); });
    }
    if (pfCar && pfTrack) {
      var pStartX = 0, pW = 1, pDragging = false;
      pfCar.addEventListener("pointerdown", function (e) {
        if (e.button != null && e.button !== 0) return;
        pDragging = true; pW = pfCar.clientWidth || 1; pStartX = e.clientX;
        pfTrack.classList.add("is-dragging");
        if (pfCar.setPointerCapture) { try { pfCar.setPointerCapture(e.pointerId); } catch (err) {} }
      });
      pfCar.addEventListener("pointermove", function (e) {
        if (!pDragging) return;
        var pct = (-pfIdx * 50) + ((e.clientX - pStartX) / pW) * 50;
        pct = Math.max(-50, Math.min(0, pct));
        pfTrack.style.transform = "translateX(" + pct + "%)";
      });
      var pEnd = function (e) {
        if (!pDragging) return;
        pDragging = false; pfTrack.classList.remove("is-dragging");
        var dx = e.clientX - pStartX, t = pW * 0.25, next = pfIdx;
        if (dx <= -t) next = 1; else if (dx >= t) next = 0;
        pfSetIndex(next);
      };
      pfCar.addEventListener("pointerup", pEnd);
      pfCar.addEventListener("pointercancel", function () {
        if (pDragging) { pDragging = false; pfTrack.classList.remove("is-dragging"); pfSetIndex(pfIdx); }
      });
      pfDots.forEach(function (d) {
        d.addEventListener("click", function (e) { e.stopPropagation(); pfSetIndex(parseInt(d.getAttribute("data-slide"), 10)); });
      });
    }

    function render(key) {
      var c = CHARACTERS[key];
      if (!c) return false;
      pfImg.src = c.src; pfImg.alt = c.name;
      if (pfImgHead) { pfImgHead.src = c.headshot || c.src; pfImgHead.alt = c.name + " headshot"; }
      pfSetIndex(0);   // always open on the outfit slide
      pfName.textContent = c.name;
      pfTier.textContent = tierLabel(c.tier);
      pfTier.className = "tier " + tierClass(c.tier);
      pfSpec.innerHTML = specRows(c.specs);
      pfTags.innerHTML = c.tags.map(function (t) { return '<span class="pf-tag">' + t + '</span>'; }).join("");
      var cur = (function () {
        try { return localStorage.getItem("currency") || "usd"; } catch (e) { return "usd"; }
      })();
      var stockPrice = typeof c.priceStock === 'string' ? c.priceStock : c.priceStock[cur];
      var sigPrice = typeof c.priceSig === 'string' ? c.priceSig : c.priceSig[cur];
      pfPricing.innerHTML =
        '<div class="pf-price-row"><span>Essential</span><span>' + stockPrice + '</span></div>' +
        '<div class="pf-price-row"><span>Signature</span><span>' + sigPrice + '</span></div>';
      if (c.tier === "sig") {
        pfAvail.className = "pf-avail is-booked";
        pfAvail.textContent = "Booked — 1 slot open";
      } else {
        pfAvail.className = "pf-avail is-available";
        pfAvail.textContent = "Available";
      }
      pfBook.textContent = "Book " + c.name + " →";
      pfBook.href = "index.html#book";
      return true;
    }

    function show(key) {
      if (profile.classList.contains("open") && profile.getAttribute("data-key") === key) return;
      if (!profile.classList.contains("open")) lastFocus = document.activeElement;
      if (!render(key)) return;
      // Close all Details overlays in the grid when profile opens (mutually exclusive)
      document.querySelectorAll(".card-info.is-open").forEach(function (btn) {
        var ph = btn.closest(".ph");
        if (ph) {
          ph.classList.remove("specs-open");
          btn.classList.remove("is-open");
          btn.setAttribute("aria-expanded", "false");
          btn.textContent = "Details";
        }
      });
      if (window.fbq) {
        fbq("track", "ViewContent", {
          content_type: "model",
          content_category: "model",
          content_ids: [key],
          content_name: CHARACTERS[key].name
        });
      }
      profile.setAttribute("data-key", key);
      profile.classList.add("open");
      profile.setAttribute("aria-hidden", "false");
      document.body.classList.add("profile-open");
      pfClose.focus();
    }

    function hide() {
      if (!profile.classList.contains("open")) return;
      profile.classList.remove("open");
      profile.removeAttribute("data-key");
      profile.setAttribute("aria-hidden", "true");
      document.body.classList.remove("profile-open");
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function keyFromHash() {
      var m = location.hash.match(/^#model\/([a-z0-9-]+)$/i);
      return m ? m[1].toLowerCase() : null;
    }

    function applyHash() {
      var key = keyFromHash();
      if (key && CHARACTERS[key]) show(key);
      else hide();
    }

    function openModel(key) {
      if (!CHARACTERS[key]) return;
      if (location.hash === "#model/" + key) applyHash();  // already there — just (re)open
      else location.hash = "model/" + key;                 // → hashchange → applyHash
    }

    function closeModel() {
      if (keyFromHash()) {
        // strip the hash without adding a history entry
        history.replaceState(null, "", location.pathname + location.search);
      }
      hide();
    }

    /* Any [data-char] element opens that model. */
    document.addEventListener("click", function (e) {
      var el = e.target.closest("[data-char]");
      if (el) { e.preventDefault(); openModel(el.getAttribute("data-char")); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        var el = e.target.closest ? e.target.closest("[data-char]") : null;
        if (el) { e.preventDefault(); openModel(el.getAttribute("data-char")); }
      }
    });

    pfClose.addEventListener("click", closeModel);
    profile.addEventListener("click", function (e) {
      if (e.target === profile || e.target.classList.contains("profile__inner")) closeModel();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && profile.classList.contains("open")) closeModel();
    });
    window.addEventListener("hashchange", applyHash);

    applyHash();  // open immediately if the page was loaded with #model/<key>
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initProfile);
  } else {
    initProfile();
  }
})();

/* =========================================================================
   Currency selector — persists across pages using localStorage.
   Used on both index.html (with FAB) and roster.html.
   ========================================================================= */
(function () {
  "use strict";
  var sel = document.getElementById("currency");
  if (!sel) return;

  function apply(cur) {
    var spans = document.querySelectorAll(".price");
    for (var i = 0; i < spans.length; i++) {
      var v = spans[i].getAttribute("data-" + cur);
      if (v != null) spans[i].textContent = v;
    }
  }

  var stored = null;
  try { stored = localStorage.getItem("currency"); } catch (e) {}
  var cur = (stored === "gbp" || stored === "eur") ? stored : "usd";
  sel.value = cur;
  apply(cur);

  sel.addEventListener("change", function () {
    var c = sel.value;
    try { localStorage.setItem("currency", c); } catch (e) {}
    apply(c);
    updateProfilePrices(c);
  });

  function updateProfilePrices(cur) {
    var profile = document.getElementById("profile");
    if (!profile || !profile.classList.contains("open")) return;
    var key = profile.getAttribute("data-key");
    if (!key) return;
    var c = CHARACTERS[key];
    if (!c) return;
    var pfPricing = document.getElementById("pfPricing");
    if (!pfPricing) return;
    var stockPrice = typeof c.priceStock === 'string' ? c.priceStock : c.priceStock[cur];
    var sigPrice = typeof c.priceSig === 'string' ? c.priceSig : c.priceSig[cur];
    pfPricing.innerHTML =
      '<div class="pf-price-row"><span>Essential</span><span>' + stockPrice + '</span></div>' +
      '<div class="pf-price-row"><span>Signature</span><span>' + sigPrice + '</span></div>';
  }
  window.LATENCY_updateProfilePrices = updateProfilePrices;

  var fab = document.getElementById("currencyFab");
  var heroEl = document.getElementById("hero");
  if (fab && heroEl && "IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { fab.classList.toggle("show", !e.isIntersecting); });
    }, { threshold: 0 }).observe(heroEl);
  } else if (fab) {
    fab.classList.add("show");
  }
})();

/* =========================================================================
   Cookie consent — gates the Meta Pixel (and CAPI). Loaded on every page.
   Default is "revoke" (set in the <head> snippet); the pixel only sends once
   the visitor accepts. Choice persisted in localStorage ("ll_consent").
   ========================================================================= */
(function () {
  "use strict";
  var KEY = "ll_consent";
  function read() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function write(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  // Expose for the CAPI client (server-side events must respect consent too).
  window.LL_consentGranted = function () { return read() === "granted"; };

  var choice = read();
  if (choice === "granted" || choice === "denied") return;  // already decided — no banner

  var css = ""
    + ".ll-consent{position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;max-width:720px;margin:0 auto;"
    + "display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:14px 16px;"
    + "background:rgba(255,255,255,0.94);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);"
    + "border:1px solid var(--line,rgba(0,0,0,0.12));border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,0.14);"
    + "font-size:13px;color:var(--muted,#777);}"
    + ".ll-consent p{margin:0;flex:1 1 240px;line-height:1.5;}"
    + ".ll-consent__actions{display:flex;gap:8px;flex:0 0 auto;}"
    + ".ll-consent button{font:inherit;font-size:12px;letter-spacing:0.04em;cursor:pointer;padding:9px 16px;"
    + "border-radius:999px;border:1px solid var(--line,rgba(0,0,0,0.12));background:#fff;color:var(--ink,#111);}"
    + ".ll-consent button.ll-consent__accept{background:var(--ink,#111);color:#fff;border-color:var(--ink,#111);}"
    + "@media (prefers-reduced-motion:no-preference){.ll-consent{animation:llup .3s ease;}}"
    + "@keyframes llup{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}";

  function start() {
    var st = document.createElement("style");
    st.textContent = css;
    document.head.appendChild(st);

    var bar = document.createElement("div");
    bar.className = "ll-consent";
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-label", "Cookie consent");
    bar.innerHTML =
      '<p>We use cookies to measure traffic and improve the site.</p>' +
      '<div class="ll-consent__actions">' +
        '<button type="button" class="ll-consent__decline">Decline</button>' +
        '<button type="button" class="ll-consent__accept">Accept</button>' +
      '</div>';
    document.body.appendChild(bar);

    bar.querySelector(".ll-consent__accept").addEventListener("click", function () {
      write("granted");
      if (window.fbq) fbq("consent", "grant");
      bar.parentNode && bar.parentNode.removeChild(bar);
    });
    bar.querySelector(".ll-consent__decline").addEventListener("click", function () {
      write("denied");
      if (window.fbq) fbq("consent", "revoke");
      bar.parentNode && bar.parentNode.removeChild(bar);
    });
  }

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})();
