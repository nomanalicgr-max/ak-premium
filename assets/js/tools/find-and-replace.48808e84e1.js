/* AK Premium v12 — find-and-replace (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Text & writing tools (batch 4) ---------- */

const findrepBtn = $("findrepBtn");
if (findrepBtn) findrepBtn.addEventListener("click", () => {
  const input = ($("findrepInput") || {}).value || "";
  if (!input.trim()) { setError("findrepStatus", "Please paste some text first."); return; }
  const result = findReplace(input, ($("findrepFind") || {}).value || "", ($("findrepReplace") || {}).value || "", !!($("findrepCase") || {}).checked);
  if (result.error) { setError("findrepStatus", result.error); return; }
  if ($("findrepOutput")) $("findrepOutput").textContent = result.result;
  setStatus("findrepStatus", "Done. Replaced " + result.count + " time" + (result.count === 1 ? "." : "s."));
});

const findrepCopyBtn = $("findrepCopyBtn");
if (findrepCopyBtn) findrepCopyBtn.addEventListener("click", () => {
  const text = ($("findrepOutput") || {}).textContent || "";
  if (!text || text.startsWith("New text")) { setStatus("findrepStatus", "Replace the text first, then use Copy Result."); return; }
  copyTextToClipboard(text, "findrepStatus");
});
