/* AK Premium v12 — jpg-to-webp (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Image tools (batch 2) ---------- */

const jpgToWebpBtn = $("jpgToWebpBtn");
if (jpgToWebpBtn) jpgToWebpBtn.addEventListener("click", async () => {
  const file = ($("jpgToWebpInput").files || [])[0];
  if (!file) { setError("jpgToWebpStatus", "Please select a JPG image first."); return; }
  if (!checkFileSize(file, "jpgToWebpStatus")) return;
  setStatus("jpgToWebpStatus", "Converting…");
  try {
    const blob = await convertImageFile(file, "image/webp", 0.92);
    if (!blob) { setError("jpgToWebpStatus", "This browser could not encode WebP. Please choose PNG or JPG instead."); return; }
    downloadBlob(blob, "ak-premium-jpg-to-webp.webp");
    setStatus("jpgToWebpStatus", "Done. WebP downloaded.");
  } catch (e) { setError("jpgToWebpStatus", "Could not convert this image. Please try a JPG file."); }
});
