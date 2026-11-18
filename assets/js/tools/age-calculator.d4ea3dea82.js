/* AK Premium v12 — age-calculator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 1 handlers: Calculators ---------- */

const ageBtn = $("ageBtn");
if (ageBtn) ageBtn.addEventListener("click", () => {
  const result = calculateAge($("ageDob").value);
  if (result.error) { setStatus("ageStatus", result.error); return; }
  if ($("ageOutput")) $("ageOutput").textContent = "Age: " + result.years + " years, " + result.months + " months, " + result.days + " days.";
  setStatus("ageStatus", "Done.");
});
