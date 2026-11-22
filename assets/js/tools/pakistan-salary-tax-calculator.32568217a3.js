/* AK Premium v12 — pakistan-salary-tax-calculator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- v4: Pakistan / Urdu tools ---------- */

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
    if (!monthly || monthly <= 0) { setError("taxStatus", "Please enter your monthly salary greater than zero."); return; }
    const year = d.years.find((y) => y.tax_year === (sel ? sel.value : "")) || d.years.find((y) => y.default) || d.years[0];
    const compareYears = !!($("taxCompareYears") && $("taxCompareYears").checked);
    const compareSalary = !!($("taxCompareSalary") && $("taxCompareSalary").checked);
    const monthly2 = parseFloat(($("taxMonthly2") || {}).value || "");
    if (compareSalary && (!monthly2 || monthly2 <= 0)) { setError("taxStatus", "Ticked compare with a second salary — please enter the second monthly salary greater than zero."); return; }
    const salaries = compareSalary ? [monthly, monthly2] : [monthly];
    const years = compareYears ? d.years.slice() : [year];
    /* Payslip-style result for the first salary and the selected year. */
    const annual = monthly * 12;
    const r = calcSalaryTax(annual, year);
    const effRate = annual > 0 ? (r.total / annual * 100) : 0;
    const el = $("taxOutput");
    if (el) el.textContent = year.label + "\nGross per month: Rs " + fmtMoney(monthly) + "\nTax per month: Rs " + fmtMoney(r.total / 12, 2) + "\nTake-home per month: Rs " + fmtMoney(monthly - r.total / 12, 2) + "\nEffective tax rate: " + effRate.toFixed(2) + "% of annual salary\n\nAnnual salary: Rs " + fmtMoney(annual) + "\nTax on salary: Rs " + fmtMoney(r.tax) + "\nSurcharge: Rs " + fmtMoney(r.surcharge) + "\nTotal annual tax: Rs " + fmtMoney(r.total) + "\n\nEstimate only. " + (year.surcharge ? year.surcharge.note + " " : "") + "This calculator uses FBR slabs for salaried individuals only and does not include rebates, allowances or other income.";
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
    /* Comparison table: one column per salary x year combination. The
       surcharge line comes straight from tax-slabs.json (9% of tax where
       TY2026 income exceeds Rs 10,000,000; none for TY2027). */
    const cmp = $("taxCompare");
    if (cmp) {
      if (!compareYears && !compareSalary) { cmp.innerHTML = ""; }
      else {
        const cols = [];
        salaries.forEach((sal) => {
          years.forEach((y) => {
            const a = sal * 12;
            const rr = calcSalaryTax(a, y);
            cols.push({ head: "Rs " + fmtMoney(sal) + "/mo — TY" + y.tax_year, annual: a, tax: rr.tax, surcharge: rr.surcharge, total: rr.total, monthlyTax: rr.total / 12, takeHome: sal - rr.total / 12, eff: a > 0 ? rr.total / a * 100 : 0 });
          });
        });
        const row = (label, fmt) => "<tr><td>" + label + "</td>" + cols.map((c) => "<td>" + fmt(c) + "</td>").join("") + "</tr>";
        cmp.innerHTML = "<table><thead><tr><th></th>" + cols.map((c) => "<th>" + escapeHtml(c.head) + "</th>").join("") + "</tr></thead><tbody>"
          + row("Annual salary", (c) => "Rs " + fmtMoney(c.annual))
          + row("Tax on salary", (c) => "Rs " + fmtMoney(c.tax))
          + row("Surcharge", (c) => "Rs " + fmtMoney(c.surcharge))
          + row("Total annual tax", (c) => "<strong>Rs " + fmtMoney(c.total) + "</strong>")
          + row("Monthly tax", (c) => "Rs " + fmtMoney(c.monthlyTax, 2))
          + row("Take-home per month", (c) => "Rs " + fmtMoney(c.takeHome, 2))
          + row("Effective tax rate", (c) => c.eff.toFixed(2) + "%")
          + "</tbody></table>"
          + (compareYears && cols.length === 2 ? "<p>TY2027 total tax is Rs " + fmtMoney(Math.abs(cols[1].total - cols[0].total)) + (cols[1].total >= cols[0].total ? " more" : " less") + " than TY2026 for this salary.</p>" : "");
      }
    }
    setStatus("taxStatus", "Done. This is an estimate only, not tax advice.");
  });
  /* Re-run when a compare box is ticked or unticked. */
  ["taxCompareYears", "taxCompareSalary"].forEach((id) => {
    const cb = $(id);
    if (cb) cb.addEventListener("change", () => { if (($("taxMonthly") || {}).value) btn.click(); });
  });
})();
/* Zakat: 2.5% of net zakatable wealth held for one lunar year. Nisab by weight (7.5 tola gold / 52.5 tola silver). */
