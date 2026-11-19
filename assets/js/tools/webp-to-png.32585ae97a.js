/* AK Premium v12 — webp-to-png (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Image tools (batch 2) ---------- */

const webpToPngBtn = $("webpToPngBtn");
if (webpToPngBtn) webpToPngBtn.addEventListener("click", async () => {
  const file = ($("webpToPngInput").files || [])[0];
  if (!file) { setError("webpToPngStatus", "Please select a WebP image first."); return; }
  if (!checkFileSize(file, "webpToPngStatus")) return;
  setStatus("webpToPngStatus", "Converting…");
  try {
    const blob = await convertImageFile(file, "image/png");
    if (!blob) { setError("webpToPngStatus", "This browser could not encode PNG. Please try again."); return; }
    downloadBlob(blob, "ak-premium-webp-to-png.png");
    setStatus("webpToPngStatus", "Done. PNG downloaded.");
  } catch (e) { setError("webpToPngStatus", "Could not convert this image. Please try a WebP file."); }
});
