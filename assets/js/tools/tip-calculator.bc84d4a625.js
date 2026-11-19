/* AK Premium v12 — tip-calculator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Calculators & converters (batch 3) ---------- */

const tipBtn = $("tipBtn");
if (tipBtn) tipBtn.addEventListener("click", () => {
  const result = tipCalc(parseFloat($("tipBill").value), parseFloat($("tipPct").value), parseFloat($("tipPeople").value));
  if (result.error) { setError("tipStatus", result.error); return; }
  if ($("tipOutput")) $("tipOutput").textContent = "Tip: " + fmtTrim(result.tip) + ". Total: " + fmtTrim(result.total) + ". Each person pays: " + fmtTrim(result.perPerson) + ".";
  setStatus("tipStatus", "Done.");
});
