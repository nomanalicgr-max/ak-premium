/* AK Premium v12 — time-zone-converter (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Calculators & converters (batch 3) ---------- */

const tzBtn = $("tzBtn");
if (tzBtn) tzBtn.addEventListener("click", () => {
  const result = tzConvert($("tzDate").value, $("tzTime").value, $("tzFrom").value, $("tzTo").value);
  if (result.error) { setError("tzStatus", result.error); return; }
  if ($("tzOutput")) $("tzOutput").textContent = result.text;
  setStatus("tzStatus", "Done.");
});
