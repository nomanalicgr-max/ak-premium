/* AK Premium v12 — txt-html-to-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Converters ---------- */

const txtHtmlPdfBtn = $("txtHtmlPdfBtn");
if (txtHtmlPdfBtn) txtHtmlPdfBtn.addEventListener("click", () => {
  const JsPDF = getJsPdf();
  if (!needLibrary(!!JsPDF, "jsPDF", "txtHtmlPdfStatus")) return;
  const raw = $("txtHtmlInput").value.trim();
  if (!raw) { setError("txtHtmlPdfStatus", "Please paste some text or simple HTML first."); return; }
  const clean = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const doc = new JsPDF();
  doc.setFontSize(12);
  addWrappedTextPaginated(doc, clean);
  doc.save("ak-premium-text-to-pdf.pdf");
  setStatus("txtHtmlPdfStatus", "Done. PDF downloaded.");
});
