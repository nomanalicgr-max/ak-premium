/* AK Premium v12 — bmi-calculator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 1 handlers: Calculators ---------- */

const bmiBtn = $("bmiBtn");
if (bmiBtn) bmiBtn.addEventListener("click", () => {
  const result = bmiCalc(parseFloat($("bmiHeight").value), parseFloat($("bmiWeight").value));
  if (result.error) { setStatus("bmiStatus", result.error); return; }
  if ($("bmiOutput")) $("bmiOutput").textContent = "BMI: " + result.bmi + " (" + result.category + ")";
  setStatus("bmiStatus", "Done.");
});
