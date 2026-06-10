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
      priceStock: "From £600 / drop", priceSig: "From £1,500 / season"
    },
    eli: {
      name: "Eli", src: "processed/Eli.png", headshot: "processed/Eli%20Headshot.png", tier: "stock",
      specs: { Height: "6'0\"", Ethnicity: "Mixed heritage", Hair: "Short fade", Eyes: "Dark brown", Build: "Athletic natural" },
      tags: ["Streetwear", "Outerwear", "Accessories", "Menswear"],
      priceStock: "From £600 / drop", priceSig: "From £1,500 / season"
    },
    hana: {
      name: "Hana", src: "processed/Hana.png", headshot: "processed/Hana%20Headshot.png", tier: "sig",
      specs: { Height: "5'6\"", Ethnicity: "East Asian", Hair: "Blunt bob", Eyes: "Dark brown", Build: "Slim precise" },
      tags: ["High fashion", "Editorial", "Contemporary", "Japanese brands"],
      priceStock: "From £600 / drop", priceSig: "From £1,500 / season"
    },
    nadia: {
      name: "Nadia", src: "processed/Nadia.png", headshot: "processed/Nadia%20Headshot.png", tier: "sig",
      specs: { Height: "5'8\"", Ethnicity: "Italian/Algerian", Hair: "Dark brown", Eyes: "Dark brown", Build: "Tall lean" },
      tags: ["Elevated basics", "Outerwear", "Jewellery", "Lifestyle"],
      priceStock: "From £600 / drop", priceSig: "From £1,500 / season"
    },
    ade: {
      name: "Ade", src: "processed/Ade.png", headshot: "processed/Ade%20Headshot.png", tier: "sig",
      specs: { Height: "6'1\"", Ethnicity: "Black American", Hair: "Thick mature locs", Eyes: "Dark brown", Build: "Lean athletic" },
      tags: ["High fashion", "Streetwear", "Editorial", "Campaign"],
      priceStock: "From £600 / drop", priceSig: "From £1,500 / season"
    },
    caspar: {
      name: "Caspar", src: "processed/Caspar.png", headshot: "processed/Caspar%20Headshot.png", tier: "stock",
      specs: { Height: "6'2\"", Ethnicity: "Scandinavian", Hair: "Buzz cut dark brown", Eyes: "Blue-grey", Build: "Tall lean" },
      tags: ["Technical outerwear", "Contemporary menswear", "Scandinavian brands", "Lifestyle"],
      priceStock: "From £600 / drop", priceSig: "From £1,500 / season"
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
      pfPricing.innerHTML =
        '<div class="pf-price-row"><span>Essential</span><span>' + c.priceStock + '</span></div>' +
        '<div class="pf-price-row"><span>Signature</span><span>' + c.priceSig + '</span></div>';
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
