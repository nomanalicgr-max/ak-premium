/* AK Premium v12 — png-to-jpg (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Image tools (batch 2) ---------- */

const pngToJpgQuality = $("pngToJpgQuality");
if (pngToJpgQuality) pngToJpgQuality.addEventListener("input", () => {
  const label = $("pngToJpgQualityLabel"); if (label) label.textContent = pngToJpgQuality.value + "%";
});

const pngToJpgBtn = $("pngToJpgBtn");
if (pngToJpgBtn) pngToJpgBtn.addEventListener("click", async () => {
  const file = ($("pngToJpgInput").files || [])[0];
  if (!file) { setError("pngToJpgStatus", "Please select a PNG image first."); return; }
  if (!checkFileSize(file, "pngToJpgStatus")) return;
  const quality = (parseInt(($("pngToJpgQuality") || {}).value || "92", 10) || 92) / 100;
  const bg = ($("pngToJpgBg") || {}).value || "#ffffff";
  setStatus("pngToJpgStatus", "Converting…");
  try {
    const src = await orientedCanvasFromFile(file);
    const flat = flattenCanvasOnColour(src.canvas, bg);
    const blob = await canvasToBlob(flat, "image/jpeg", quality);
    if (!blob) { setError("pngToJpgStatus", "This browser could not encode JPG. Please try again."); return; }
    downloadBlob(blob, "ak-premium-png-to-jpg.jpg");
    setStatus("pngToJpgStatus", "Done. JPG downloaded (" + flat.width + " x " + flat.height + " px, quality " + Math.round(quality * 100) + "%" + (src.orientation > 1 ? ", rotation fixed from photo data" : "") + ").");
  } catch (e) { setError("pngToJpgStatus", "Could not convert this image. Please try a PNG file."); }
});

/* JPG to PNG: full PNG by default, or PNG-8 (256 colours, much smaller)
   via UPNG.js when the toggle is on. EXIF orientation is applied on load. */
