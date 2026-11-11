/* AK Premium v9 — bundle-pakistan (split from app.js, Phase 4.3). Loads after core.js. */

/* ---------- v4: Pakistan / Urdu tools ---------- */

(function initLand() {
  const btn = $("landBtn"); if (!btn) return;
  btn.addEventListener("click", () => {
    const val = parseFloat(($("landValue").value || "").trim());
    const from = $("landFrom") ? $("landFrom").value : "kanal";
    if (!val || val <= 0) { setStatus("landStatus", "Please enter a land area greater than zero."); return; }
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

(function initTax() {
  const btn = $("taxBtn"); if (!btn) return;
  const sel = $("taxYear");
  loadTaxData("taxStatus").then((d) => {
    if (!d || !sel) return;
    sel.innerHTML = d.years.map((y) => '<option value="' + y.tax_year + '"' + (y.default ? " selected" : "") + ">" + y.label + "</option>").join("");
    try {
      const y0 = d.years.find((y) => y.tax_year === sel.value) || d.years[0];
      const ty = parseInt(y0.tax_year, 10);
      const ts = $("taxSource");
      if (ts) ts.textContent = "Tax Year " + y0.tax_year + " (FY " + (ty - 1) + "-" + String(ty).slice(2) + ") \u00b7 data verified " + (d.verified ? new Date(d.verified).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "9 Nov 2026") + " \u00b7 Source: FBR";
      const urlY = new URLSearchParams(window.location.search).get("taxYear");
      if (urlY && d.years.some((y) => y.tax_year === urlY)) sel.value = urlY;
    } catch (e2) {}
  });
  btn.addEventListener("click", async () => {
    const d = await loadTaxData("taxStatus"); if (!d) return;
    const monthly = parseFloat(($("taxMonthly").value || "").trim());
    if (!monthly || monthly <= 0) { setStatus("taxStatus", "Please enter your monthly salary greater than zero."); return; }
    const year = d.years.find((y) => y.tax_year === (sel ? sel.value : "")) || d.years.find((y) => y.default) || d.years[0];
    const annual = monthly * 12;
    const r = calcSalaryTax(annual, year);
    const el = $("taxOutput");
    if (el) el.textContent = year.label + "\nAnnual salary: Rs " + fmtMoney(annual) + "\nTax on salary: Rs " + fmtMoney(r.tax) + "\nSurcharge: Rs " + fmtMoney(r.surcharge) + "\nTotal annual tax: Rs " + fmtMoney(r.total) + "\nMonthly tax: Rs " + fmtMoney(r.total / 12) + "\nTake-home per month: Rs " + fmtMoney(monthly - r.total / 12) + "\n\nEstimate only. " + (year.surcharge ? year.surcharge.note : "") + " This calculator uses FBR slabs for salaried individuals only and does not include rebates, allowances or other income.";
    const ts = $("taxSource");
    if (ts) { try { const ty = parseInt(year.tax_year, 10); ts.textContent = "Tax Year " + year.tax_year + " (FY " + (ty - 1) + "-" + String(ty).slice(2) + ") \u00b7 data verified " + (d.verified ? new Date(d.verified).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "9 Nov 2026") + " \u00b7 Source: FBR"; } catch (e2) {} }
    const bd = $("taxBreakdown");
    if (bd) {
      let prev = 0; const rows = [];
      for (const slab of year.slabs) {
        const cap = slab.up_to === null ? annual : Math.min(annual, slab.up_to);
        if (cap <= prev) break;
        const portion = cap - prev;
        rows.push("<tr><td>Rs " + fmtMoney(prev + 1) + " \u2013 " + (slab.up_to === null ? "above" : "Rs " + fmtMoney(slab.up_to)) + "</td><td>" + Math.round(slab.rate * 100) + "%</td><td>Rs " + fmtMoney(slab.rate * portion) + "</td></tr>");
        prev = slab.up_to;
      }
      bd.innerHTML = "<table><thead><tr><th>Slab</th><th>Rate</th><th>Tax</th></tr></thead><tbody>" + rows.join("") + (r.surcharge ? "<tr><td>Surcharge</td><td></td><td>Rs " + fmtMoney(r.surcharge) + "</td></tr>" : "") + "<tr><td><strong>Total tax</strong></td><td></td><td><strong>Rs " + fmtMoney(r.total) + "</strong></td></tr></tbody></table>";
    }
    setStatus("taxStatus", "Done. This is an estimate only, not tax advice.");
  });
})();
/* Zakat: 2.5% of net zakatable wealth held for one lunar year. Nisab by weight (7.5 tola gold / 52.5 tola silver). */

(function initZakat() {
  const btn = $("zakatBtn"); if (!btn) return;
  btn.addEventListener("click", async () => {
    const cash = parseFloat(($("zakatCash").value || "0")) || 0;
    const gold = parseFloat(($("zakatGold").value || "0")) || 0;
    const silver = parseFloat(($("zakatSilver").value || "0")) || 0;
    const debts = parseFloat(($("zakatDebts").value || "0")) || 0;
    const goldRate = parseFloat(($("zakatGoldRate").value || "0")) || 0;
    const silverRate = parseFloat(($("zakatSilverRate").value || "0")) || 0;
    const net = cash + gold * goldRate + silver * silverRate - debts;
    const nisabSilver = 52.5 * silverRate, nisabGold = 7.5 * goldRate;
    const customNisab = parseFloat(($("zakatNisab") && $("zakatNisab").value) || "0") || 0;
    const nisab = customNisab > 0 ? customNisab : (silverRate > 0 ? nisabSilver : nisabGold);
    const due = net >= nisab && nisab > 0 ? net * 0.025 : 0;
    const el = $("zakatOutput");
    if (el) el.textContent = "Net zakatable wealth: Rs " + fmtMoney(net) + "\nNisab (" + (customNisab > 0 ? "your custom nisab" : "52.5 tola silver at your rate") + "): Rs " + fmtMoney(nisab) + "\nZakat due (2.5%): Rs " + fmtMoney(due) + (due === 0 ? "\nNo Zakat is due, because your wealth is below the nisab." : "") + "\n\nNisab is 7.5 tola gold or 52.5 tola silver. The government bank-deduction nisab for Ramadan 2026 was reported as Rs 503,529, but that figure was not directly verified from an official source, and the government re-notifies it every year — verify before relying on it. This calculator is an estimate only, not religious advice.";
    setStatus("zakatStatus", "Done. This is an estimate only.");
  });
})();
/* Amount to words: English and Urdu, for invoices and cheques. */

(function initAmountWords() {
  const btn = $("amountWordsBtn"); if (!btn) return;
  btn.addEventListener("click", () => {
    const raw = ($("amountWordsInput").value || "").trim().replace(/,/g, "");
    const amount = parseFloat(raw);
    if (!raw || isNaN(amount) || amount < 0 || amount >= 1000000000) { setStatus("amountWordsStatus", "Please enter an amount from 0 to 999,999,999."); return; }
    const rupees = Math.floor(amount), paisa = Math.round((amount - rupees) * 100);
    const en = numToWordsEn(rupees) + " rupees" + (paisa ? " and " + numToWordsEn(paisa) + " paisa" : "") + " only";
    const ur = numToWordsUr(rupees) + " روپے" + (paisa ? " اور " + numToWordsUr(paisa) + " پیسے" : "") + " صرف";
    const el = $("amountWordsOutput");
    if (el) { el.innerHTML = ""; const p1 = document.createElement("p"); p1.textContent = en; const p2 = document.createElement("p"); p2.setAttribute("dir", "rtl"); p2.setAttribute("lang", "ur"); p2.textContent = ur; el.appendChild(p1); el.appendChild(p2); }
    setStatus("amountWordsStatus", "Done.");
  });
})();
/* Urdu word / character counter. */

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

(function initMerit() {
  const btn = $("meritBtn"); if (!btn) return;
  btn.addEventListener("click", () => {
    const rows = [];
    for (let i = 1; i <= 3; i++) {
      const obtained = parseFloat(($("meritObtained" + i).value || "")) || 0;
      const total = parseFloat(($("meritTotal" + i).value || "")) || 0;
      const weight = parseFloat(($("meritWeight" + i).value || "")) || 0;
      if (total > 0 && weight > 0) rows.push({ obtained, total, weight, pct: obtained / total * 100 });
    }
    if (!rows.length) { setStatus("meritStatus", "Please enter at least one part: obtained marks, total marks and its weight."); return; }
    const weightSum = rows.reduce((a, r) => a + r.weight, 0);
    if (Math.abs(weightSum - 100) > 0.01) { setStatus("meritStatus", "Weights add up to " + weightSum + "%. They should add up to 100% for a merit aggregate."); return; }
    const aggregate = rows.reduce((a, r) => a + r.pct * r.weight / 100, 0);
    const el = $("meritOutput");
    if (el) el.textContent = rows.map((r, i) => "Part " + (i + 1) + ": " + r.pct.toFixed(2) + "% x " + r.weight + "% weight = " + (r.pct * r.weight / 100).toFixed(2)).join("\n") + "\n\nMerit aggregate: " + aggregate.toFixed(2) + "%\n\nFormula: sum of (obtained / total x 100 x weight / 100) for each part.";
    setStatus("meritStatus", "Done.");
  });
})();
