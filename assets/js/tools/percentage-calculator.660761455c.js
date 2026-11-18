/* AK Premium v12 — percentage-calculator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 1 handlers: Calculators ---------- */

const percentBtn = $("percentBtn");
if (percentBtn) percentBtn.addEventListener("click", () => {
  const result = percentageCalc($("percentMode").value, parseFloat($("percentX").value), parseFloat($("percentY").value));
  if (result.error) { setStatus("percentStatus", result.error); return; }
  if ($("percentOutput")) $("percentOutput").textContent = result.text;
  setStatus("percentStatus", "Done.");
});
