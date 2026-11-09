/* AK Premium common.js — consent, ads, analytics, dark mode, shared helpers.
   Ads and analytics stay completely disabled while their IDs are empty.
   No ad or analytics script is loaded before the user accepts cookies. */
(function () {
  var cfg = window.AK_CONFIG || {};
  var CONSENT_KEY = "ak-consent";
  function getConsent() { try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; } }
  function setConsent(v) { try { localStorage.setItem(CONSENT_KEY, v); } catch (e) {} }
  function loadAds() {
    if (!cfg.ADSENSE_CLIENT_ID) return;
    if (document.querySelector('script[data-ak-adsense]')) return;
    var s = document.createElement("script");
    s.async = true; s.setAttribute("data-ak-adsense", "1");
    s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(cfg.ADSENSE_CLIENT_ID);
    s.setAttribute("crossorigin", "anonymous");
    document.head.appendChild(s);
    document.querySelectorAll(".ad-slot").forEach(function (slot) {
      if (!slot.querySelector("ins.adsbygoogle")) {
        var ins = document.createElement("ins");
        ins.className = "adsbygoogle";
        ins.style.display = "block";
        ins.setAttribute("data-ad-client", cfg.ADSENSE_CLIENT_ID);
        ins.setAttribute("data-ad-slot", slot.getAttribute("data-ad-slot") || "");
        ins.setAttribute("data-ad-format", "auto");
        ins.setAttribute("data-full-width-responsive", "true");
        slot.appendChild(ins);
      }
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
    });
  }
  function loadAnalytics() {
    if (!cfg.GA_MEASUREMENT_ID) return;
    if (document.querySelector('script[data-ak-ga]')) return;
    var s = document.createElement("script");
    s.async = true; s.setAttribute("data-ak-ga", "1");
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(cfg.GA_MEASUREMENT_ID);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", cfg.GA_MEASUREMENT_ID, { anonymize_ip: true });
  }
  function applyConsent() {
    var c = getConsent();
    var banner = document.getElementById("consentBanner");
    if (banner) banner.hidden = !!c;
    if (c === "accepted") { loadAds(); loadAnalytics(); }
  }
  document.addEventListener("DOMContentLoaded", function () {
    var accept = document.getElementById("consentAccept");
    var reject = document.getElementById("consentReject");
    if (accept) accept.addEventListener("click", function () { setConsent("accepted"); applyConsent(); });
    if (reject) reject.addEventListener("click", function () { setConsent("rejected"); applyConsent(); });
    applyConsent();
    // Dark mode: follows the operating system, with a manual toggle in the header.
    var toggle = document.getElementById("darkModeToggle");
    var saved = null;
    try { saved = localStorage.getItem("ak-theme"); } catch (e) {}
    if (saved === "dark" || (!saved && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.setAttribute("data-theme", "dark");
    }
    if (toggle) toggle.addEventListener("click", function () {
      var dark = document.documentElement.getAttribute("data-theme") === "dark";
      document.documentElement.setAttribute("data-theme", dark ? "light" : "dark");
      try { localStorage.setItem("ak-theme", dark ? "light" : "dark"); } catch (e) {}
    });
  });
  window.AK = window.AK || {};
  window.AK.applyConsent = applyConsent;
})();
