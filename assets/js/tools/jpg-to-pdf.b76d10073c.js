/* AK Premium v12 — jpg-to-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- PDF Studio ---------- */

const jpgQuality = $("jpgQuality");
if (jpgQuality) jpgQuality.addEventListener("input", () => {
  const label = $("jpgQualityLabel"); if (label) label.textContent = jpgQuality.value + "%";
});

const jpgToPdfBtn = $("jpgToPdfBtn");
if (jpgToPdfBtn) jpgToPdfBtn.addEventListener("click", async () => {
  const files = Array.from($("jpgToPdfInput").files || []);
  if (!files.length) { setError("jpgToPdfStatus", "Please select at least one JPG image."); return; }
  if (!files.every((f) => checkFileSize(f, "jpgToPdfStatus"))) return;
  const q = $("jpgQuality") ? parseInt($("jpgQuality").value, 10) : 92;
  const full = $("jpgPrintSize") ? $("jpgPrintSize").value === "full" : false;
  imagesToPdf(files, "jpgToPdfStatus", "ak-premium-jpg-to-pdf.pdf", {
    layout: $("jpgLayout") ? $("jpgLayout").value : "1",
    pageSize: $("jpgPageSize") ? $("jpgPageSize").value : "a4",
    autoRotate: $("jpgRotate") ? $("jpgRotate").checked : true,
    grayscale: $("jpgGray") ? $("jpgGray").checked : false,
    quality: full ? 1 : Math.min(100, Math.max(50, isNaN(q) ? 92 : q)) / 100,
    dpi: full ? 72 : 150
  });
});
