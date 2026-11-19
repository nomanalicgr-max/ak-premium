/* AK Premium v12 — slug-generator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Developer tools (batch 5) ---------- */

const slugInput = $("slugInput");
if (slugInput) slugInput.addEventListener("input", () => {
  const text = slugInput.value || "";
  if ($("slugOutput")) $("slugOutput").textContent = text.trim() ? slugifyText(text) : "Your slug will appear here.";
});

const slugCopyBtn = $("slugCopyBtn");
if (slugCopyBtn) slugCopyBtn.addEventListener("click", () => {
  const text = ($("slugOutput") || {}).textContent || "";
  if (!text || text === "Your slug will appear here.") { setStatus("slugStatus", "Type a title first, then use Copy Slug."); return; }
  copyTextToClipboard(text, "slugStatus");
});
