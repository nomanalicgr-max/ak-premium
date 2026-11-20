/* AK Premium v12 — json-to-xml (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Developer tools (batch 5) ---------- */

const jxBtn = $("jxBtn");
if (jxBtn) jxBtn.addEventListener("click", () => {
  const input = ($("jxInput") || {}).value || "";
  if (!input.trim()) { setError("jxStatus", "Please paste some JSON first."); return; }
  let out;
  try { out = jsonToXmlText(input); } catch (e) { setError("jxStatus", "That JSON could not be read. Check for a missing comma or bracket."); return; }
  if ($("jxOutput")) $("jxOutput").textContent = out;
  setStatus("jxStatus", "Done. JSON converted to XML.");
});

const jxCopyBtn = $("jxCopyBtn");
if (jxCopyBtn) jxCopyBtn.addEventListener("click", () => {
  const text = ($("jxOutput") || {}).textContent || "";
  if (!text || text === "Your XML will appear here.") { setStatus("jxStatus", "Convert the JSON first, then use Copy Result."); return; }
  copyTextToClipboard(text, "jxStatus");
});
