/* AK Premium v12 — webp-to-jpg (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Image tools (batch 2) ---------- */

const webpToJpgBtn = $("webpToJpgBtn");
if (webpToJpgBtn) webpToJpgBtn.addEventListener("click", async () => {
  const file = ($("webpToJpgInput").files || [])[0];
  if (!file) { setError("webpToJpgStatus", "Please select a WebP image first."); return; }
  if (!checkFileSize(file, "webpToJpgStatus")) return;
  setStatus("webpToJpgStatus", "Converting…");
  try {
    const blob = await convertImageFile(file, "image/jpeg", 0.92);
    if (!blob) { setError("webpToJpgStatus", "This browser could not encode JPG. Please try again."); return; }
    downloadBlob(blob, "ak-premium-webp-to-jpg.jpg");
    setStatus("webpToJpgStatus", "Done. JPG downloaded.");
  } catch (e) { setError("webpToJpgStatus", "Could not convert this image. Please try a WebP file."); }
});
