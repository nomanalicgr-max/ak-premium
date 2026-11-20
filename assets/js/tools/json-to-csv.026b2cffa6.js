/* AK Premium v12 — json-to-csv (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Developer tools (batch 5) ---------- */

const jcBtn = $("jcBtn");
if (jcBtn) jcBtn.addEventListener("click", () => {
  const input = ($("jcInput") || {}).value || "";
  if (!input.trim()) { setError("jcStatus", "Please paste a JSON list first."); return; }
  let out;
  try { out = jsonToCsvText(input); } catch (e) { setError("jcStatus", e.message || "That JSON could not be read."); return; }
  if ($("jcOutput")) $("jcOutput").textContent = out;
  setStatus("jcStatus", "Done. JSON converted to CSV.");
});

const jcCopyBtn = $("jcCopyBtn");
if (jcCopyBtn) jcCopyBtn.addEventListener("click", () => {
  const text = ($("jcOutput") || {}).textContent || "";
  if (!text || text === "Your CSV will appear here.") { setStatus("jcStatus", "Convert the JSON first, then use Copy Result."); return; }
  copyTextToClipboard(text, "jcStatus");
});

const jcDownloadBtn = $("jcDownloadBtn");
if (jcDownloadBtn) jcDownloadBtn.addEventListener("click", () => {
  const text = ($("jcOutput") || {}).textContent || "";
  if (!text || text === "Your CSV will appear here.") { setStatus("jcStatus", "Convert the JSON first, then use Download CSV."); return; }
  downloadText(text, "ak-premium-data.csv", "text/csv;charset=utf-8");
  setStatus("jcStatus", "Done. CSV downloaded.");
});
