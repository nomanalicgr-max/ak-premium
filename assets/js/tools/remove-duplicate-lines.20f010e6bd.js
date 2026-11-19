/* AK Premium v12 — remove-duplicate-lines (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Text & writing tools (batch 4) ---------- */

const dedupeBtn = $("dedupeBtn");
if (dedupeBtn) dedupeBtn.addEventListener("click", () => {
  const input = ($("dedupeInput") || {}).value || "";
  if (!input.trim()) { setError("dedupeStatus", "Please paste some lines first."); return; }
  const result = dedupeLines(input, !!($("dedupeCase") || {}).checked);
  if ($("dedupeOutput")) $("dedupeOutput").textContent = result.lines.join("\n") || "No lines left.";
  setStatus("dedupeStatus", "Done. Removed " + result.removed + " duplicate line" + (result.removed === 1 ? "." : "s."));
});

const dedupeCopyBtn = $("dedupeCopyBtn");
if (dedupeCopyBtn) dedupeCopyBtn.addEventListener("click", () => {
  const text = ($("dedupeOutput") || {}).textContent || "";
  if (!text || text.startsWith("Cleaned list")) { setStatus("dedupeStatus", "Remove duplicates first, then use Copy Result."); return; }
  copyTextToClipboard(text, "dedupeStatus");
});
