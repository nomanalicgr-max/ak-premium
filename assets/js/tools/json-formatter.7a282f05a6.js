/* AK Premium v12 — json-formatter (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 1 handlers: Developer ---------- */

const jsonFormatBtn = $("jsonFormatBtn");
if (jsonFormatBtn) jsonFormatBtn.addEventListener("click", () => {
  try { $("jsonOutput").textContent = prettyJson($("jsonInput").value); setStatus("jsonStatus", "Done. JSON formatted."); }
  catch (e) { setError("jsonStatus", "Invalid JSON: " + e.message); }
});

const jsonMinifyBtn = $("jsonMinifyBtn");
if (jsonMinifyBtn) jsonMinifyBtn.addEventListener("click", () => {
  try { $("jsonOutput").textContent = minifyJson($("jsonInput").value); setStatus("jsonStatus", "Done. JSON minified."); }
  catch (e) { setError("jsonStatus", "Invalid JSON: " + e.message); }
});

const jsonValidateBtn = $("jsonValidateBtn");
if (jsonValidateBtn) jsonValidateBtn.addEventListener("click", () => {
  try { JSON.parse($("jsonInput").value); $("jsonOutput").textContent = "Valid JSON."; setStatus("jsonStatus", "Done. JSON is valid."); }
  catch (e) { setError("jsonStatus", "Invalid JSON: " + e.message); }
});

const jsonCopyBtn = $("jsonCopyBtn");
if (jsonCopyBtn) jsonCopyBtn.addEventListener("click", () => {
  const text = $("jsonOutput") ? $("jsonOutput").textContent : "";
  if (!text || text.startsWith("Formatted JSON")) { setStatus("jsonStatus", "Format, minify or validate JSON first, then use Copy."); return; }
  copyTextToClipboard(text, "jsonStatus");
});
