/* AK Premium v12 — png-to-jpg (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Image tools (batch 2) ---------- */

const pngToJpgBtn = $("pngToJpgBtn");
if (pngToJpgBtn) pngToJpgBtn.addEventListener("click", async () => {
  const file = ($("pngToJpgInput").files || [])[0];
  if (!file) { setError("pngToJpgStatus", "Please select a PNG image first."); return; }
  if (!checkFileSize(file, "pngToJpgStatus")) return;
  setStatus("pngToJpgStatus", "Converting…");
  try {
    const blob = await convertImageFile(file, "image/jpeg", 0.92);
    if (!blob) { setError("pngToJpgStatus", "This browser could not encode JPG. Please try again."); return; }
    downloadBlob(blob, "ak-premium-png-to-jpg.jpg");
    setStatus("pngToJpgStatus", "Done. JPG downloaded.");
  } catch (e) { setError("pngToJpgStatus", "Could not convert this image. Please try a PNG file."); }
});
