/* AK Premium v12 — case-converter (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 2 handlers: Developer ---------- */

const caseCopyBtn = $("caseCopyBtn");
if (caseCopyBtn) caseCopyBtn.addEventListener("click", () => {
  const text = $("caseOutput") ? $("caseOutput").textContent : "";
  if (!text || text.startsWith("Converted text")) { setStatus("caseStatus", "Convert text first, then use Copy."); return; }
  copyTextToClipboard(text, "caseStatus");
});
