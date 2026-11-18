/* AK Premium v12 — urdu-word-counter (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- v4: Pakistan / Urdu tools ---------- */

(function initUrduCounter() {
  const btn = $("urduCounterBtn"); if (!btn) return;
  btn.addEventListener("click", () => {
    const text = $("urduCounterInput") ? $("urduCounterInput").value : "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length, charsNoSpaces = text.replace(/\s/g, "").length;
    const el = $("urduCounterOutput");
    if (el) el.textContent = "Words: " + words + "\nCharacters (with spaces): " + chars + "\nCharacters (without spaces): " + charsNoSpaces + "\nReading time: about " + Math.max(1, Math.ceil(words / 200)) + " minute(s) at 200 words per minute.";
    setStatus("urduCounterStatus", "Done.");
  });
})();
/* Percentage / marks / merit aggregate: generic weighted formula, user-editable weights. */
