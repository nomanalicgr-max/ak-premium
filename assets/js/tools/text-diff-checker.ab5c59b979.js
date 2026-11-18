/* AK Premium v12 — text-diff-checker (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 2 handlers: Developer ---------- */

const diffBtn = $("diffBtn");
if (diffBtn) diffBtn.addEventListener("click", () => {
  const result = diffTexts($("diffOriginal").value, $("diffChanged").value);
  if (result.identical) { if ($("diffOutput")) $("diffOutput").textContent = "No differences found."; setStatus("diffStatus", "Done."); return; }
  const parts = [];
  if (result.removed.length) parts.push("Removed:\n- " + result.removed.join("\n- "));
  if (result.added.length) parts.push("Added:\n+ " + result.added.join("\n+ "));
  parts.push("Unchanged lines: " + result.unchanged);
  if ($("diffOutput")) $("diffOutput").textContent = parts.join("\n\n");
  setStatus("diffStatus", "Done.");
});
