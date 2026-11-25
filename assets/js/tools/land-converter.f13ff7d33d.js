/* AK Premium v12 — land-converter (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- v33: Calculators 2 + Pakistan ---------- */

function landUnitsForMarla(marlaSqFt) {
  const m = marlaSqFt;
  // Kanal (5,445 sq ft) and acre (43,560 sq ft) are fixed; only the marla
  // itself, the bigha (20 marla) and the sarsai (marla / 9) move with the
  // marla size. Perch, guntha, cent, ropani and hectare are fixed units.
  return { marla: m, kanal: 5445, acre: 43560, sqft: 1, sqyd: 9, sqm: 10.7639, bigha: 20 * m, guntha: 1089, cent: 435.6, ropani: 5476, perch: 272.25, hectare: 107639, sarsai: m / 9 };
}

function landPriceEstimate(marlaArea, ratePerMarla) {
  if (!marlaArea || marlaArea <= 0 || !ratePerMarla || ratePerMarla <= 0) return { error: "Please enter an area and a rate per marla more than 0." };
  return { price: Math.round(marlaArea * ratePerMarla) };
}

function landFromDimensions(lengthFt, widthFt, marlaSqFt) {
  if (!lengthFt || lengthFt <= 0 || !widthFt || widthFt <= 0) return { error: "Please enter a length and a width more than 0." };
  const sqft = lengthFt * widthFt;
  return { sqft, marla: sqft / marlaSqFt, kanal: sqft / (20 * marlaSqFt) };
}
// Zakat on cash, gold, silver, trade goods, shares, foreign currency and
// loans given, less debts. All money fields are in the selected currency;
// a USD selection converts everything to rupees at the typed rate.
/* Zakat totals: 2.5% of net zakatable wealth. Asset amounts are in the
   chosen currency and converted to rupees at the typed rate; gold, silver
   and foreign-currency rates are market rates in rupees and are NOT
   converted, and a custom nisab is in rupees too. */

/* ---------- v4: Pakistan / Urdu tools ---------- */

function landMarlaSize() {
  const sel = $("landMarla");
  const choice = sel ? sel.value : "revenue";
  if (choice === "society") return 225;
  if (choice === "scheme") return 250;
  if (choice === "custom") {
    const v = parseFloat(($("landCustomMarla") || {}).value);
    return (v && v > 0) ? v : 272.25;
  }
  return 272.25;
}

(function initLand() {
  const btn = $("landBtn"); if (!btn) return;
  btn.addEventListener("click", () => {
    const val = parseFloat(($("landValue").value || "").trim());
    const from = $("landFrom") ? $("landFrom").value : "kanal";
    if (!val || val <= 0) { setError("landStatus", "Please enter a land area greater than zero."); return; }
    const marlaSqFt = landMarlaSize();
    const units = landUnitsForMarla(marlaSqFt);
    const sqft = val * units[from];
    const rows = [
      ["Marla", sqft / units.marla], ["Kanal", sqft / units.kanal], ["Acre", sqft / units.acre],
      ["Square feet", sqft], ["Square yards", sqft / units.sqyd], ["Square metres", sqft / units.sqm],
      ["Bigha (Punjab)", sqft / units.bigha], ["Guntha", sqft / units.guntha], ["Cent", sqft / units.cent],
      ["Ropani (Nepal)", sqft / units.ropani], ["Perch", sqft / units.perch], ["Hectare", sqft / units.hectare],
      ["Sarsai", sqft / units.sarsai]
    ].map((r) => r[0] + ": " + (Math.round(r[1] * 100) / 100).toLocaleString("en-PK")).join("\n");
    let out = val + " " + from + " is:\n" + rows + "\n\n1 Kanal = 20 Marla. 1 Acre = 8 Kanal = 43,560 sq ft. Marla size used: " + marlaSqFt + " sq ft.";
    const length = parseFloat(($("landLength") || {}).value);
    const width = parseFloat(($("landWidth") || {}).value);
    if (length > 0 && width > 0) {
      const dim = landFromDimensions(length, width, marlaSqFt);
      out += "\n\n" + length + " ft x " + width + " ft = " + dim.sqft.toLocaleString("en-PK") + " sq ft, which is " + (Math.round(dim.marla * 100) / 100) + " Marla (" + (Math.round(dim.kanal * 100) / 100) + " Kanal).";
    }
    const rate = parseFloat(($("landRate") || {}).value);
    if (rate > 0) {
      const price = landPriceEstimate(sqft / marlaSqFt, rate);
      if (!price.error) out += "\n\nPrice estimate at Rs " + rate.toLocaleString("en-PK") + " per marla: Rs " + price.price.toLocaleString("en-PK") + ". This uses the rate you typed only; it is not a market price.";
    }
    const el = $("landOutput"); if (el) el.textContent = out;
    setStatus("landStatus", "Done.");
  });
})();
/* Pakistan salary tax: slabs loaded from /assets/data/tax-slabs.json (FBR, verified 2026-11-09). */
/* Fallback slabs, identical to /assets/data/tax-slabs.json (FBR, verified 2026-11-09).
   Used only if the JSON file cannot be fetched, so the calculator still works. */
