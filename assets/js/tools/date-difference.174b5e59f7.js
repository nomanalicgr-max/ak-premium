/* AK Premium v12 — date-difference (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Calculators & converters (batch 3) ---------- */

const ddBtn = $("ddBtn");
if (ddBtn) ddBtn.addEventListener("click", () => {
  const result = dateDiffCalc($("ddFrom").value, $("ddTo").value);
  if (result.error) { setError("ddStatus", result.error); return; }
  const dayWord = result.remDays === 1 ? " day" : " days";
  const monthWord = result.months === 1 ? " month." : " months.";
  if ($("ddOutput")) $("ddOutput").textContent = result.days + " days. That is " + result.weeks + " weeks and " + result.remDays + dayWord + ", or " + result.months + monthWord;
  setStatus("ddStatus", "Done.");
});
