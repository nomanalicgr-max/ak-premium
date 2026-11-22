/* AK Premium v12 — mortgage-calculator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Calculators & converters (batch 3) ---------- */

const mortBtn = $("mortBtn");
if (mortBtn) mortBtn.addEventListener("click", () => {
  const principal = parseFloat($("mortPrincipal").value);
  const rate = parseFloat($("mortRate").value);
  const years = parseFloat($("mortYears").value);
  const tax = parseFloat(($("mortTax") || {}).value) || 0;
  const ins = parseFloat(($("mortIns") || {}).value) || 0;
  const hoa = parseFloat(($("mortHoa") || {}).value) || 0;
  const extra = parseFloat(($("mortExtra") || {}).value) || 0;
  const lump = parseFloat(($("mortLump") || {}).value) || 0;
  const sched = buildAmortisation(principal, rate, years, extra, lump);
  if (sched.error) { setError("mortStatus", sched.error); return; }
  const monthlyTotal = sched.emi + tax + ins + hoa;
  const extrasTotal = (tax + ins + hoa) * sched.monthsCount;
  let out = "Monthly principal & interest: " + fmtMoney(sched.emi, 2)
    + "\nProperty tax per month: " + fmtMoney(tax, 2)
    + "\nInsurance per month: " + fmtMoney(ins, 2)
    + "\nHOA per month: " + fmtMoney(hoa, 2)
    + "\nTotal monthly payment: " + fmtMoney(monthlyTotal, 2)
    + "\nTotal paid (principal & interest): " + fmtMoney(sched.totalPaid, 2)
    + "\nTotal interest: " + fmtMoney(sched.totalInterest, 2)
    + "\nMonths: " + sched.monthsCount;
  if (extra > 0 || lump > 0) {
    out += "\n\nWith your extra payment" + (extra > 0 ? " of " + fmtMoney(extra, 2) + " a month" : "") + (lump > 0 ? " and a lump sum of " + fmtMoney(lump, 2) : "") + ":";
    out += "\nInterest saved: " + fmtMoney(sched.interestSaved, 2);
    out += "\nMonths cut: " + sched.monthsCut;
    out += "\nDebt-free by: " + sched.payoffMonth;
  }
  if ($("mortOutput")) $("mortOutput").textContent = out;
  const yr = $("mortYearly");
  if (yr) yr.innerHTML = amortisationYearlyTable(sched);
  const sch = $("mortSchedule");
  if (sch) sch.innerHTML = amortisationMonthTable(sched);
  const cmp = $("mortCompareOut");
  if (cmp) {
    if (!($("mortCompare") && $("mortCompare").checked)) { cmp.innerHTML = ""; }
    else {
      const s20 = buildAmortisation(principal, rate, 20, extra, lump);
      const s30 = buildAmortisation(principal, rate, 30, extra, lump);
      if (s20.error || s30.error) { cmp.innerHTML = "<p>" + escapeHtml((s20.error || s30.error)) + "</p>"; }
      else {
        const row = (label, a, b) => "<tr><td>" + label + "</td><td>" + a + "</td><td>" + b + "</td></tr>";
        cmp.innerHTML = "<table><thead><tr><th></th><th>20-year term</th><th>30-year term</th></tr></thead><tbody>"
          + row("Monthly principal & interest", fmtMoney(s20.emi, 2), fmtMoney(s30.emi, 2))
          + row("Total monthly payment", fmtMoney(s20.emi + tax + ins + hoa, 2), fmtMoney(s30.emi + tax + ins + hoa, 2))
          + row("Total interest", fmtMoney(s20.totalInterest, 2), fmtMoney(s30.totalInterest, 2))
          + row("Total paid (principal & interest)", fmtMoney(s20.totalPaid, 2), fmtMoney(s30.totalPaid, 2))
          + row("Months", s20.monthsCount, s30.monthsCount)
          + row("Debt-free by", s20.payoffMonth, s30.payoffMonth)
          + "</tbody></table>"
          + "<p>The 30-year term costs " + fmtMoney(s30.totalInterest - s20.totalInterest, 2) + " more in interest than the 20-year term, but the monthly payment is " + fmtMoney(s20.emi - s30.emi, 2) + " lower.</p>";
      }
    }
  }
  setStatus("mortStatus", "Done.");
});

const mortCsvBtn = $("mortCsvBtn");
if (mortCsvBtn) mortCsvBtn.addEventListener("click", () => {
  const sched = buildAmortisation(parseFloat($("mortPrincipal").value), parseFloat($("mortRate").value), parseFloat($("mortYears").value), parseFloat(($("mortExtra") || {}).value) || 0, parseFloat(($("mortLump") || {}).value) || 0);
  if (sched.error) { setError("mortStatus", sched.error); return; }
  downloadText(amortisationCsv(sched), "ak-premium-mortgage-schedule.csv", "text/csv");
  setStatus("mortStatus", "Done. Schedule downloaded as CSV.");
});

const mortCompareCb = $("mortCompare");
if (mortCompareCb) mortCompareCb.addEventListener("change", () => { if (($("mortPrincipal") || {}).value) mortBtn.click(); });
