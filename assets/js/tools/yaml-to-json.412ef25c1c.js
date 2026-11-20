/* AK Premium v12 — yaml-to-json (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Developer tools (batch 5) ---------- */

const yjBtn = $("yjBtn");
if (yjBtn) yjBtn.addEventListener("click", () => {
  const input = ($("yjInput") || {}).value || "";
  if (!input.trim()) { setError("yjStatus", "Please paste some YAML first."); return; }
  if (!needLibrary(typeof window.jsyaml !== "undefined", "js-yaml", "yjStatus")) return;
  let out;
  try { out = yamlToJsonText(input); } catch (e) { setError("yjStatus", "That YAML could not be read. Check the indents and that tabs and spaces are not mixed."); return; }
  if ($("yjOutput")) $("yjOutput").textContent = out;
  setStatus("yjStatus", "Done. YAML converted to JSON.");
});

const yjCopyBtn = $("yjCopyBtn");
if (yjCopyBtn) yjCopyBtn.addEventListener("click", () => {
  const text = ($("yjOutput") || {}).textContent || "";
  if (!text || text === "Your JSON will appear here.") { setStatus("yjStatus", "Convert the YAML first, then use Copy Result."); return; }
  copyTextToClipboard(text, "yjStatus");
});
