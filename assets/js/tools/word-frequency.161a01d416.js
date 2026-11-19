/* AK Premium v12 — word-frequency (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Text & writing tools (batch 4) ---------- */

const wfBtn = $("wfBtn");
if (wfBtn) wfBtn.addEventListener("click", () => {
  const input = ($("wfInput") || {}).value || "";
  if (!input.trim()) { setError("wfStatus", "Please paste some text first."); return; }
  const result = wordFrequency(input, !!($("wfStopwords") || {}).checked, ($("wfTop") || {}).value);
  if ($("wfOutput")) $("wfOutput").textContent = result.rows.length ? result.rows.map(([w, n]) => w + ": " + n).join("\n") : "No words found.";
  setStatus("wfStatus", "Done. " + result.total + " different word" + (result.total === 1 ? " counted." : "s counted."));
});
