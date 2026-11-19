/* AK Premium v12 — pdf-to-png (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- New PDF tools: Remove Pages + Add Watermark ---------- */

const pdfToPngBtn = $("pdfToPngBtn");
if (pdfToPngBtn) pdfToPngBtn.addEventListener("click", async () => {
  const file = ($("pdfToPngInput").files || [])[0];
  if (!file) { setError("pdfToPngStatus", "Please select a PDF file first."); return; }
  if (!checkFileSize(file, "pdfToPngStatus")) return;
  renderPdfPagesToImages(file, "png", "pdfToPngStatus", $("pdfToPngOutput"));
});
