/* AK Premium v12 — compound-interest (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Calculators & converters (batch 3) ---------- */

const ciBtn = $("ciBtn");
if (ciBtn) ciBtn.addEventListener("click", () => {
  const result = compoundCalc(parseFloat($("ciPrincipal").value), parseFloat($("ciRate").value), parseFloat($("ciYears").value), parseFloat($("ciFreq").value));
  if (result.error) { setError("ciStatus", result.error); return; }
  if ($("ciOutput")) $("ciOutput").textContent = "Maturity amount: " + fmtMoney(result.amount, 0) + ". Interest earned: " + fmtMoney(result.interest, 0) + ".";
  setStatus("ciStatus", "Done.");
});
