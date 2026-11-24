/* AK Premium v12 — pdf-to-jpg (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Remove Pages: visual picker, blank-page and text search ---------- */

const jpgOutQuality = $("jpgOutQuality");
if (jpgOutQuality) jpgOutQuality.addEventListener("input", () => {
  const label = $("jpgOutQualityLabel"); if (label) label.textContent = jpgOutQuality.value + "%";
});

const pdfToJpgBtn = $("pdfToJpgBtn");
if (pdfToJpgBtn) pdfToJpgBtn.addEventListener("click", async () => {
  const file = ($("pdfToJpgInput").files || [])[0];
  if (!file) { setError("pdfToJpgStatus", "Please select a PDF file first."); return; }
  if (!checkFileSize(file, "pdfToJpgStatus")) return;
  const q = $("jpgOutQuality") ? parseInt($("jpgOutQuality").value, 10) : 90;
  renderPdfPagesToImages(file, "jpg", "pdfToJpgStatus", $("pdfToJpgOutput"), {
    dpi: $("jpgOutDpi") ? (parseInt($("jpgOutDpi").value, 10) || 150) : 150,
    quality: Math.min(100, Math.max(50, isNaN(q) ? 90 : q)) / 100,
    pages: $("jpgOutPages") ? $("jpgOutPages").value : "all",
    grayscale: $("jpgOutGray") ? $("jpgOutGray").checked : false,
    maxWidth: $("jpgOutWidth") ? (parseInt($("jpgOutWidth").value, 10) || 0) : 0
  });
});
