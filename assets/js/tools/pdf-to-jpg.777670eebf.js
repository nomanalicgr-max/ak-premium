/* AK Premium v12 — pdf-to-jpg (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- New PDF tools: Remove Pages + Add Watermark ---------- */

const pdfToJpgBtn = $("pdfToJpgBtn");
if (pdfToJpgBtn) pdfToJpgBtn.addEventListener("click", async () => {
  const file = ($("pdfToJpgInput").files || [])[0];
  if (!file) { setError("pdfToJpgStatus", "Please select a PDF file first."); return; }
  if (!checkFileSize(file, "pdfToJpgStatus")) return;
  renderPdfPagesToImages(file, "jpg", "pdfToJpgStatus", $("pdfToJpgOutput"));
});
