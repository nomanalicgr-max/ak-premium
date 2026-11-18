/* AK Premium v12 — loan-emi-calculator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 2 handlers: Calculators ---------- */

const emiBtn = $("emiBtn");
if (emiBtn) emiBtn.addEventListener("click", () => {
  const result = emiCalc(parseFloat($("emiPrincipal").value), parseFloat($("emiRate").value), parseFloat($("emiYears").value));
  if (result.error) { setStatus("emiStatus", result.error); return; }
  if ($("emiOutput")) $("emiOutput").textContent = "Monthly EMI: Rs " + fmtMoney(result.emi, 2) + "\nTotal payment: Rs " + fmtMoney(result.total, 2) + "\nTotal interest: Rs " + fmtMoney(result.interest, 2) + "\nMonths: " + result.months;
  const bd = $("emiBreakdown");
  if (bd) bd.innerHTML = "<table><tbody>" + "<tr><td>Monthly EMI</td><td>Rs " + fmtMoney(result.emi, 2) + "</td></tr>" + "<tr><td>Principal</td><td>Rs " + fmtMoney(parseFloat($("emiPrincipal").value) || 0, 2) + "</td></tr>" + "<tr><td>Total interest</td><td>Rs " + fmtMoney(result.interest, 2) + "</td></tr>" + "<tr><td>Total payment</td><td>Rs " + fmtMoney(result.total, 2) + "</td></tr>" + "<tr><td>Months</td><td>" + result.months + "</td></tr></tbody></table>";
  setStatus("emiStatus", "Done.");
});
