/* AK Premium v12 — sort-lines (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Text & writing tools (batch 4) ---------- */

const sortBtn = $("sortBtn");
if (sortBtn) sortBtn.addEventListener("click", () => {
  const input = ($("sortInput") || {}).value || "";
  if (!input.trim()) { setError("sortStatus", "Please paste some lines first."); return; }
  const result = sortLinesFn(input, ($("sortOrder") || {}).value, !!($("sortIgnoreEmpty") || {}).checked);
  if ($("sortOutput")) $("sortOutput").textContent = result.lines.join("\n") || "No lines left.";
  setStatus("sortStatus", "Done. Sorted " + result.lines.length + " line" + (result.lines.length === 1 ? "." : "s."));
});

const sortCopyBtn = $("sortCopyBtn");
if (sortCopyBtn) sortCopyBtn.addEventListener("click", () => {
  const text = ($("sortOutput") || {}).textContent || "";
  if (!text || text.startsWith("Sorted list")) { setStatus("sortStatus", "Sort the lines first, then use Copy Result."); return; }
  copyTextToClipboard(text, "sortStatus");
});
