/* AK Premium v12 — calorie-tdee-calculator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Calculators & converters (batch 3) ---------- */

const tdeeBtn = $("tdeeBtn");
if (tdeeBtn) tdeeBtn.addEventListener("click", () => {
  const result = tdeeCalc(parseFloat($("tdeeAge").value), $("tdeeSex").value, parseFloat($("tdeeHeight").value), parseFloat($("tdeeWeight").value), parseFloat($("tdeeActivity").value));
  if (result.error) { setError("tdeeStatus", result.error); return; }
  if ($("tdeeOutput")) $("tdeeOutput").textContent = "BMR: " + result.bmr + " calories a day. TDEE: " + result.tdee + " calories a day.";
  setStatus("tdeeStatus", "Done.");
});
