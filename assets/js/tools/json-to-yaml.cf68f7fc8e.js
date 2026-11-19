/* AK Premium v12 — json-to-yaml (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Developer tools (batch 5) ---------- */

const jyBtn = $("jyBtn");
if (jyBtn) jyBtn.addEventListener("click", () => {
  const input = ($("jyInput") || {}).value || "";
  if (!input.trim()) { setError("jyStatus", "Please paste some JSON first."); return; }
  if (!needLibrary(typeof window.jsyaml !== "undefined", "js-yaml", "jyStatus")) return;
  let out;
  try { out = jsonToYamlText(input); } catch (e) { setError("jyStatus", "That JSON could not be read. Check for a missing comma or bracket."); return; }
  if ($("jyOutput")) $("jyOutput").textContent = out;
  setStatus("jyStatus", "Done. JSON converted to YAML.");
});

const jyCopyBtn = $("jyCopyBtn");
if (jyCopyBtn) jyCopyBtn.addEventListener("click", () => {
  const text = ($("jyOutput") || {}).textContent || "";
  if (!text || text === "Your YAML will appear here.") { setStatus("jyStatus", "Convert the JSON first, then use Copy Result."); return; }
  copyTextToClipboard(text, "jyStatus");
});
