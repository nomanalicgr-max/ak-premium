/* AK Premium v12 — png-to-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- PDF Studio ---------- */

const pngToPdfBtn = $("pngToPdfBtn");
if (pngToPdfBtn) pngToPdfBtn.addEventListener("click", async () => {
  const files = Array.from($("pngToPdfInput").files || []);
  if (!files.length) { setError("pngToPdfStatus", "Please select at least one PNG image."); return; }
  if (!files.every((f) => checkFileSize(f, "pngToPdfStatus"))) return;
  imagesToPdf(files, "pngToPdfStatus", "ak-premium-png-to-pdf.pdf");
});
