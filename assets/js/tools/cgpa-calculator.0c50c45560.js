/* AK Premium v12 — cgpa-calculator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 2 handlers: Calculators ---------- */

const cgpaBtn = $("cgpaBtn");
if (cgpaBtn) cgpaBtn.addEventListener("click", () => {
  const result = parseCgpa($("cgpaInput").value);
  if (result.error) { setStatus("cgpaStatus", result.error); return; }
  if ($("cgpaOutput")) $("cgpaOutput").textContent = "CGPA: " + result.cgpa.toFixed(2) + "\nTotal credit hours: " + result.credits;
  setStatus("cgpaStatus", "Done.");
});
