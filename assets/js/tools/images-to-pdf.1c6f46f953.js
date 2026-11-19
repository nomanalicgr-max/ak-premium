/* AK Premium v12 — images-to-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- PDF Studio ---------- */

const imagesPdfBtn = $("imagesPdfBtn");
if (imagesPdfBtn) imagesPdfBtn.addEventListener("click", async () => {
  const files = Array.from($("imagesInput").files || []);
  if (!files.length) { setError("imagesPdfStatus", "Please select at least one JPG, PNG or WebP image."); return; }
  if (!files.every((f) => checkFileSize(f, "imagesPdfStatus"))) return;
  imagesToPdf(files, "imagesPdfStatus", "ak-premium-images.pdf");
});
