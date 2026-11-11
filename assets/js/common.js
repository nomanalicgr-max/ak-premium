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
    // Contact form: a plain GET form to a mailto: URL navigates the browser
    // to "mailto:...?name=...&body=..." which browsers reject with an error
    // page. Instead, build a proper mailto link in JavaScript and open it
    // with an anchor click, so the page itself never navigates anywhere.
    // If no email app is set up, the user can copy the message instead.
    var contactForm = document.getElementById("contactForm");
    if (contactForm) {
      var contactBody = "";
      contactForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var name = (document.getElementById("contactName") || {}).value || "";
        var email = (document.getElementById("contactEmail") || {}).value || "";
        var msg = (document.getElementById("contactMessage") || {}).value || "";
        var status = document.getElementById("contactStatus");
        name = name.trim(); email = email.trim(); msg = msg.trim();
        if (!name || !msg) {
          if (status) status.textContent = "Please add your name and a message before sending.";
          return;
        }
        var to = (window.AK_CONFIG && window.AK_CONFIG.CONTACT_EMAIL) || "nomanalicgr@gmail.com";
        var subject = "AK Premium feedback" + (name ? " from " + name : "");
        contactBody = "Name: " + name + "\nEmail: " + (email || "(not given)") + "\n\n" + msg;
        var mailto = "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(contactBody);
        var a = document.createElement("a");
        a.href = mailto;
        document.body.appendChild(a);
        a.click();
        a.remove();
        if (status) status.textContent = "Your email app should open with the message ready — press Send there. If nothing opened, use the Copy message button and paste it into your email app.";
        var copyBtn = document.getElementById("contactCopyBtn");
        if (copyBtn) copyBtn.hidden = false;
      });
      var copyBtn = document.getElementById("contactCopyBtn");
      if (copyBtn) copyBtn.addEventListener("click", function () {
        var status = document.getElementById("contactStatus");
        function done(ok) {
          if (status) status.textContent = ok ? "Message copied. Paste it into your email app and send it to " + ((window.AK_CONFIG && window.AK_CONFIG.CONTACT_EMAIL) || "nomanalicgr@gmail.com") + "." : "Copy did not work in this browser. Select the text in the form and copy it by hand.";
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(contactBody).then(function () { done(true); }, function () { done(false); });
        } else { done(false); }
      });
    }
    var accept = document.getElementById("consentAccept");
    var reject = document.getElementById("consentReject");
    if (accept) accept.addEventListener("click", function () { setConsent("accepted"); applyConsent(); });
    if (reject) reject.addEventListener("click", function () { setConsent("rejected"); applyConsent(); });
    applyConsent();
    // Dark mode: the theme was already applied before first paint by the
    // inline script in <head> (saved "ak-theme" choice, else the OS setting).
    // Here we only keep the toggle button in sync and handle clicks.
    var toggle = document.getElementById("darkModeToggle");
    function syncThemeToggle() {
      if (!toggle) return;
      toggle.setAttribute("aria-pressed", document.documentElement.getAttribute("data-theme") === "dark" ? "true" : "false");
    }
    if (!document.documentElement.hasAttribute("data-theme")) {
      var saved = null;
      try { saved = localStorage.getItem("ak-theme"); } catch (e) {}
      if (saved === "dark" || (!saved && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.setAttribute("data-theme", "light");
      }
    }
    syncThemeToggle();
    if (toggle) toggle.addEventListener("click", function () {
      var dark = document.documentElement.getAttribute("data-theme") === "dark";
      document.documentElement.setAttribute("data-theme", dark ? "light" : "dark");
      try { localStorage.setItem("ak-theme", dark ? "light" : "dark"); } catch (e) {}
      syncThemeToggle();
    });
  });
  window.AK = window.AK || {};
  window.AK.applyConsent = applyConsent;
})();
