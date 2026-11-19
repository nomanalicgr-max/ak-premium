/* AK Premium v12 — lorem-ipsum-generator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Text & writing tools (batch 4) ---------- */

const loremBtn = $("loremBtn");
if (loremBtn) loremBtn.addEventListener("click", () => {
  const result = loremIpsum(($("loremUnit") || {}).value, ($("loremCount") || {}).value);
  if ($("loremOutput")) $("loremOutput").textContent = result.text;
  setStatus("loremStatus", "Done. Placeholder text generated.");
});

const loremCopyBtn = $("loremCopyBtn");
if (loremCopyBtn) loremCopyBtn.addEventListener("click", () => {
  const text = ($("loremOutput") || {}).textContent || "";
  if (!text || text.startsWith("Placeholder text")) { setStatus("loremStatus", "Generate the text first, then use Copy Text."); return; }
  copyTextToClipboard(text, "loremStatus");
});
