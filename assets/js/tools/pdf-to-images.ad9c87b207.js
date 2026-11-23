/* AK Premium v12 — pdf-to-images (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Remove Pages: visual picker, blank-page and text search ---------- */

const pdfImagesBtn = $("pdfImagesBtn");
if (pdfImagesBtn) pdfImagesBtn.addEventListener("click", async () => {
  const file = ($("pdfImagesInput").files || [])[0];
  if (!file) { setError("pdfImagesStatus", "Please select a PDF file first."); return; }
  if (!checkFileSize(file, "pdfImagesStatus")) return;
  renderPdfPagesToImages(file, $("pdfImagesFormat") ? $("pdfImagesFormat").value : "png", "pdfImagesStatus", $("pdfImagesOutput"), {
    dpi: $("pdfImagesDpi") ? (parseInt($("pdfImagesDpi").value, 10) || 150) : 150,
    grayscale: $("pdfImagesGray") ? $("pdfImagesGray").checked : false,
    transparent: $("pdfImagesTransparent") ? $("pdfImagesTransparent").checked : false,
    pages: $("pdfImagesPages") ? $("pdfImagesPages").value : "all"
  });
});
