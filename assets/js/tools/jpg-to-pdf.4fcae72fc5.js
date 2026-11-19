/* AK Premium v12 — jpg-to-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- PDF Studio ---------- */

const jpgToPdfBtn = $("jpgToPdfBtn");
if (jpgToPdfBtn) jpgToPdfBtn.addEventListener("click", async () => {
  const files = Array.from($("jpgToPdfInput").files || []);
  if (!files.length) { setError("jpgToPdfStatus", "Please select at least one JPG image."); return; }
  if (!files.every((f) => checkFileSize(f, "jpgToPdfStatus"))) return;
  imagesToPdf(files, "jpgToPdfStatus", "ak-premium-jpg-to-pdf.pdf");
});
