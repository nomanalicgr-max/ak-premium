/* AK Premium v12 — xml-to-json (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Developer tools (batch 5) ---------- */

const xjBtn = $("xjBtn");
if (xjBtn) xjBtn.addEventListener("click", () => {
  const input = ($("xjInput") || {}).value || "";
  if (!input.trim()) { setError("xjStatus", "Please paste some XML first."); return; }
  let out;
  try { out = xmlToJsonText(input); } catch (e) { setError("xjStatus", e.message || "That XML could not be read."); return; }
  if ($("xjOutput")) $("xjOutput").textContent = out;
  setStatus("xjStatus", "Done. XML converted to JSON.");
});

const xjCopyBtn = $("xjCopyBtn");
if (xjCopyBtn) xjCopyBtn.addEventListener("click", () => {
  const text = ($("xjOutput") || {}).textContent || "";
  if (!text || text === "Your JSON will appear here.") { setStatus("xjStatus", "Convert the XML first, then use Copy Result."); return; }
  copyTextToClipboard(text, "xjStatus");
});
