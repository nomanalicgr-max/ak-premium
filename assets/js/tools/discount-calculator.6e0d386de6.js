/* AK Premium v12 — discount-calculator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Calculators & converters (batch 3) ---------- */

const discBtn = $("discBtn");
if (discBtn) discBtn.addEventListener("click", () => {
  const result = discountCalc(parseFloat($("discPrice").value), parseFloat($("discPct").value));
  if (result.error) { setError("discStatus", result.error); return; }
  if ($("discOutput")) $("discOutput").textContent = "Discount amount: " + fmtTrim(result.discount) + ". Final price: " + fmtTrim(result.final) + ".";
  setStatus("discStatus", "Done.");
});
