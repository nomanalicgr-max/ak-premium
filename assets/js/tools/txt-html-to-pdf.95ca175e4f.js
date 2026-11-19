/* AK Premium v12 — txt-html-to-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Converters ---------- */

const txtHtmlPdfBtn = $("txtHtmlPdfBtn");
if (txtHtmlPdfBtn) txtHtmlPdfBtn.addEventListener("click", () => {
  const raw = $("txtHtmlInput").value.trim();
  if (!raw) { setError("txtHtmlPdfStatus", "Please paste some text or simple HTML first."); return; }
  textToPdf(raw, "txtHtmlPdfStatus", "ak-premium-text-to-pdf.pdf");
});
