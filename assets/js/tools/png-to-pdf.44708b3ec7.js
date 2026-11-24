/* AK Premium v12 — png-to-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- PDF Studio ---------- */

const pngQuality = $("pngQuality");
if (pngQuality) pngQuality.addEventListener("input", () => {
  const label = $("pngQualityLabel"); if (label) label.textContent = pngQuality.value + "%";
});

const pngFlatten = $("pngFlatten");
if (pngFlatten) pngFlatten.addEventListener("change", () => {
  const row = $("pngFlattenColorRow"); if (row) row.style.display = pngFlatten.value === "custom" ? "" : "none";
});

const pngToPdfBtn = $("pngToPdfBtn");
if (pngToPdfBtn) pngToPdfBtn.addEventListener("click", async () => {
  const files = Array.from($("pngToPdfInput").files || []);
  if (!files.length) { setError("pngToPdfStatus", "Please select at least one PNG image."); return; }
  if (!files.every((f) => checkFileSize(f, "pngToPdfStatus"))) return;
  const q = $("pngQuality") ? parseInt($("pngQuality").value, 10) : 92;
  const toJpeg = $("pngToJpeg") ? $("pngToJpeg").checked : false;
  let flattenBg = null;
  if ($("pngFlatten")) {
    const v = $("pngFlatten").value;
    if (v === "custom") flattenBg = ($("pngFlattenColor") && $("pngFlattenColor").value) || "#ffffff";
    else if (v !== "keep") flattenBg = v;
  }
  imagesToPdf(files, "pngToPdfStatus", "ak-premium-png-to-pdf.pdf", {
    layout: $("pngLayout") ? $("pngLayout").value : "1",
    pageSize: $("pngPageSize") ? $("pngPageSize").value : "a4",
    grayscale: $("pngGray") ? $("pngGray").checked : false,
    flattenBg: flattenBg,
    toJpeg: toJpeg,
    quality: Math.min(100, Math.max(50, isNaN(q) ? 92 : q)) / 100,
    dpi: 150
  });
});
