/* AK Premium v12 — jpg-to-png (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Image tools (batch 2) ---------- */

const jpgToPngBtn = $("jpgToPngBtn");
if (jpgToPngBtn) jpgToPngBtn.addEventListener("click", async () => {
  const file = ($("jpgToPngInput").files || [])[0];
  if (!file) { setError("jpgToPngStatus", "Please select a JPG image first."); return; }
  if (!checkFileSize(file, "jpgToPngStatus")) return;
  setStatus("jpgToPngStatus", "Converting…");
  try {
    const blob = await convertImageFile(file, "image/png");
    if (!blob) { setError("jpgToPngStatus", "This browser could not encode PNG. Please try again."); return; }
    downloadBlob(blob, "ak-premium-jpg-to-png.png");
    setStatus("jpgToPngStatus", "Done. PNG downloaded.");
  } catch (e) { setError("jpgToPngStatus", "Could not convert this image. Please try a JPG file."); }
});
