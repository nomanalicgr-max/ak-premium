/* AK Premium v12 — land-converter (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- v4: Pakistan / Urdu tools ---------- */

(function initLand() {
  const btn = $("landBtn"); if (!btn) return;
  btn.addEventListener("click", () => {
    const val = parseFloat(($("landValue").value || "").trim());
    const from = $("landFrom") ? $("landFrom").value : "kanal";
    if (!val || val <= 0) { setError("landStatus", "Please enter a land area greater than zero."); return; }
    const sqft = val * LAND_UNITS[from];
    const out = [
      ["Marla", sqft / 272.25], ["Kanal", sqft / 5445], ["Acre", sqft / 43560],
      ["Square feet", sqft], ["Square yards", sqft / 9], ["Square metres", sqft / 10.7639]
    ].map((r) => r[0] + ": " + (Math.round(r[1] * 100) / 100).toLocaleString("en-PK")).join("\n");
    const el = $("landOutput"); if (el) el.textContent = val + " " + from + " is:\n" + out + "\n\n1 Kanal = 20 Marla = 5,445 sq ft. 1 Acre = 8 Kanal = 43,560 sq ft.";
    setStatus("landStatus", "Done.");
  });
})();
/* Pakistan salary tax: slabs loaded from /assets/data/tax-slabs.json (FBR, verified 2026-11-09). */
/* Fallback slabs, identical to /assets/data/tax-slabs.json (FBR, verified 2026-11-09).
   Used only if the JSON file cannot be fetched, so the calculator still works. */
