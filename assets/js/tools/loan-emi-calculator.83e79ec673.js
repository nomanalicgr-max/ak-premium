/* AK Premium v12 — loan-emi-calculator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 2 handlers: Calculators ---------- */

const emiBtn = $("emiBtn");
if (emiBtn) emiBtn.addEventListener("click", () => {
  const principal = parseFloat($("emiPrincipal").value);
  const rate = parseFloat($("emiRate").value);
  const years = parseFloat($("emiYears").value);
  const extra = parseFloat(($("emiExtra") || {}).value) || 0;
  const lump = parseFloat(($("emiLump") || {}).value) || 0;
  const sched = buildAmortisation(principal, rate, years, extra, lump);
  if (sched.error) { setStatus("emiStatus", sched.error); return; }
  let out = "Monthly EMI: Rs " + fmtMoney(sched.emi, 2) + "\nTotal payment: Rs " + fmtMoney(sched.totalPaid, 2) + "\nTotal interest: Rs " + fmtMoney(sched.totalInterest, 2) + "\nMonths: " + sched.monthsCount;
  if (extra > 0 || lump > 0) {
    out += "\n\nWith your extra payment" + (extra > 0 ? " of Rs " + fmtMoney(extra, 2) + " a month" : "") + (lump > 0 ? " and a lump sum of Rs " + fmtMoney(lump, 2) : "") + ":";
    out += "\nInterest saved: Rs " + fmtMoney(sched.interestSaved, 2);
    out += "\nMonths cut: " + sched.monthsCut;
    out += "\nDebt-free by: " + sched.payoffMonth;
  }
  if ($("emiOutput")) $("emiOutput").textContent = out;
  const bd = $("emiBreakdown");
  if (bd) bd.innerHTML = "<table><tbody>" + "<tr><td>Monthly EMI</td><td>Rs " + fmtMoney(sched.emi, 2) + "</td></tr>" + "<tr><td>Principal</td><td>Rs " + fmtMoney(principal, 2) + "</td></tr>" + "<tr><td>Total interest</td><td>Rs " + fmtMoney(sched.totalInterest, 2) + "</td></tr>" + "<tr><td>Total payment</td><td>Rs " + fmtMoney(sched.totalPaid, 2) + "</td></tr>" + "<tr><td>Months</td><td>" + sched.monthsCount + "</td></tr>" + (sched.monthsCut > 0 ? "<tr><td>Interest saved</td><td>Rs " + fmtMoney(sched.interestSaved, 2) + "</td></tr><tr><td>Months cut</td><td>" + sched.monthsCut + "</td></tr><tr><td>Debt-free by</td><td>" + sched.payoffMonth + "</td></tr>" : "") + "</tbody></table>";
  const chart = $("emiChart");
  if (chart) chart.innerHTML = amortisationChart(sched);
  const yr = $("emiYearly");
  if (yr) yr.innerHTML = amortisationYearlyTable(sched);
  const sch = $("emiSchedule");
  if (sch) sch.innerHTML = amortisationMonthTable(sched);
  const cmp = $("emiCompareOut");
  if (cmp) {
    if (!($("emiCompare") && $("emiCompare").checked)) { cmp.innerHTML = ""; }
    else {
      const p2 = parseFloat(($("emiPrincipal2") || {}).value);
      const r2 = parseFloat(($("emiRate2") || {}).value);
      const y2 = parseFloat(($("emiYears2") || {}).value);
      const s2 = buildAmortisation(p2, r2, y2, 0, 0);
      if (s2.error) { cmp.innerHTML = "<p>Second loan: " + escapeHtml(s2.error) + "</p>"; }
      else {
        const row = (label, a, b) => "<tr><td>" + label + "</td><td>" + a + "</td><td>" + b + "</td></tr>";
        cmp.innerHTML = "<table><thead><tr><th></th><th>Loan 1</th><th>Loan 2</th></tr></thead><tbody>"
          + row("Monthly EMI", "Rs " + fmtMoney(sched.emi, 2), "Rs " + fmtMoney(s2.emi, 2))
          + row("Total interest", "Rs " + fmtMoney(sched.totalInterest, 2), "Rs " + fmtMoney(s2.totalInterest, 2))
          + row("Total payment", "Rs " + fmtMoney(sched.totalPaid, 2), "Rs " + fmtMoney(s2.totalPaid, 2))
          + row("Months", sched.monthsCount, s2.monthsCount)
          + "</tbody></table>";
      }
    }
  }
  setStatus("emiStatus", "Done.");
});

const emiCsvBtn = $("emiCsvBtn");
if (emiCsvBtn) emiCsvBtn.addEventListener("click", () => {
  const sched = buildAmortisation(parseFloat($("emiPrincipal").value), parseFloat($("emiRate").value), parseFloat($("emiYears").value), parseFloat(($("emiExtra") || {}).value) || 0, parseFloat(($("emiLump") || {}).value) || 0);
  if (sched.error) { setStatus("emiStatus", sched.error); return; }
  downloadText(amortisationCsv(sched), "ak-premium-emi-schedule.csv", "text/csv");
  setStatus("emiStatus", "Done. Schedule downloaded as CSV.");
});

const emiCompareCb = $("emiCompare");
if (emiCompareCb) emiCompareCb.addEventListener("change", () => { if (($("emiPrincipal") || {}).value) emiBtn.click(); });
