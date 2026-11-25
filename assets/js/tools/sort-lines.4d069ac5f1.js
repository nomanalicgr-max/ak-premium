/* AK Premium v12 — sort-lines (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Text & writing tools (batch 4) ---------- */

function sortLinesFn(text, order, ignoreEmpty) {
  const lines = String(text || "").split("\n").map((s) => s.trim());
  const kept = ignoreEmpty ? lines.filter(Boolean) : lines;
  const sorted = kept.slice();
  if (order === "za") sorted.sort((a, b) => b.localeCompare(a));
  else if (order === "num") sorted.sort((a, b) => {
    const na = parseFloat(a), nb = parseFloat(b);
    if (isNaN(na) && isNaN(nb)) return a.localeCompare(b);
    if (isNaN(na)) return 1;
    if (isNaN(nb)) return -1;
    return na - nb;
  });
  else if (order === "len-desc") sorted.sort((a, b) => b.length - a.length);
  else if (order === "len-asc") sorted.sort((a, b) => a.length - b.length);
  else if (order === "natural") sorted.sort(new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }).compare);
  else if (order === "reverse") sorted.reverse();
  else if (order === "shuffle") { for (let i = sorted.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const tmp = sorted[i]; sorted[i] = sorted[j]; sorted[j] = tmp; } }
  else sorted.sort((a, b) => a.localeCompare(b));
  return { lines: sorted };
}

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
