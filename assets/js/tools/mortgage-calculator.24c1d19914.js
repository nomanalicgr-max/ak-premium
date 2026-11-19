/* AK Premium v12 — mortgage-calculator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Calculators & converters (batch 3) ---------- */

const mortBtn = $("mortBtn");
if (mortBtn) mortBtn.addEventListener("click", () => {
  const result = emiCalc(parseFloat($("mortPrincipal").value), parseFloat($("mortRate").value), parseFloat($("mortYears").value));
  if (result.error) { setError("mortStatus", result.error); return; }
  if ($("mortOutput")) $("mortOutput").textContent = "Monthly payment: " + fmtMoney(result.emi, 2) + ". Total paid: " + fmtMoney(result.total, 2) + ". Total interest: " + fmtMoney(result.interest, 2) + ".";
  setStatus("mortStatus", "Done.");
});
