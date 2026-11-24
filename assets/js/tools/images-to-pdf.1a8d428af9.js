/* AK Premium v12 — images-to-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- PDF Studio ---------- */

const imagesQuality = $("imagesQuality");
if (imagesQuality) imagesQuality.addEventListener("input", () => {
  const label = $("imagesQualityLabel"); if (label) label.textContent = imagesQuality.value + "%";
});

const imagesPdfBtn = $("imagesPdfBtn");
if (imagesPdfBtn) imagesPdfBtn.addEventListener("click", async () => {
  const files = Array.from($("imagesInput").files || []);
  if (!files.length) { setError("imagesPdfStatus", "Please select at least one JPG, PNG or WebP image."); return; }
  if (!files.every((f) => checkFileSize(f, "imagesPdfStatus"))) return;
  const q = $("imagesQuality") ? parseInt($("imagesQuality").value, 10) : 92;
  imagesToPdf(files, "imagesPdfStatus", "ak-premium-images.pdf", {
    layout: $("imagesLayout") ? $("imagesLayout").value : "1",
    pageSize: $("imagesPageSize") ? $("imagesPageSize").value : "a4",
    marginMm: $("imagesMargin") ? (parseInt($("imagesMargin").value, 10) || 10) : 10,
    fit: $("imagesFit") ? $("imagesFit").value : "fit",
    autoRotate: $("imagesRotate") ? $("imagesRotate").checked : true,
    keepMeta: $("imagesMeta") ? $("imagesMeta").value === "keep" : false,
    quality: Math.min(100, Math.max(50, isNaN(q) ? 92 : q)) / 100,
    dpi: $("imagesDpi") ? (parseInt($("imagesDpi").value, 10) || 150) : 150
  });
});
