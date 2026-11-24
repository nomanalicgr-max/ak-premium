/* AK Premium v12 — webp-to-jpg (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Image tools (batch 2) ---------- */

const webpToJpgQuality = $("webpToJpgQuality");
if (webpToJpgQuality) webpToJpgQuality.addEventListener("input", () => {
  const label = $("webpToJpgQualityLabel"); if (label) label.textContent = webpToJpgQuality.value + "%";
});

const webpToJpgBtn = $("webpToJpgBtn");
if (webpToJpgBtn) webpToJpgBtn.addEventListener("click", async () => {
  const file = ($("webpToJpgInput").files || [])[0];
  if (!file) { setError("webpToJpgStatus", "Please select a WebP image first."); return; }
  if (!checkFileSize(file, "webpToJpgStatus")) return;
  const quality = (parseInt(($("webpToJpgQuality") || {}).value || "92", 10) || 92) / 100;
  const bg = ($("webpToJpgBg") || {}).value || "#ffffff";
  setStatus("webpToJpgStatus", "Converting…");
  try {
    const src = await orientedCanvasFromFile(file);
    const flat = flattenCanvasOnColour(src.canvas, bg);
    const blob = await canvasToBlob(flat, "image/jpeg", quality);
    if (!blob) { setError("webpToJpgStatus", "This browser could not encode JPG. Please try again."); return; }
    downloadBlob(blob, "ak-premium-webp-to-jpg.jpg");
    setStatus("webpToJpgStatus", "Done. JPG downloaded (" + flat.width + " x " + flat.height + " px, quality " + Math.round(quality * 100) + "%" + (src.orientation > 1 ? ", rotation fixed from photo data" : "") + ").");
  } catch (e) { setError("webpToJpgStatus", "Could not convert this image. Please try a WebP file."); }
});

/* WebP to PNG: full PNG by default, or PNG-8 (256 colours, much smaller)
   via UPNG.js when the toggle is on. EXIF orientation is applied on load. */
