/* AK Premium v12 — webp-to-png (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Image tools (batch 2) ---------- */

const webpToPngBtn = $("webpToPngBtn");
if (webpToPngBtn) webpToPngBtn.addEventListener("click", async () => {
  const file = ($("webpToPngInput").files || [])[0];
  if (!file) { setError("webpToPngStatus", "Please select a WebP image first."); return; }
  if (!checkFileSize(file, "webpToPngStatus")) return;
  const png8 = !!($("webpToPngPng8") || {}).checked;
  setStatus("webpToPngStatus", "Converting…");
  try {
    const src = await orientedCanvasFromFile(file);
    let blob, note;
    if (png8) {
      const res = await encodePng8FromCanvas(src.canvas);
      blob = res.blob;
      note = res.png8 ? "PNG-8 (256 colours)" : "PNG (this small image could not be saved as PNG-8, so a full-colour PNG was saved instead)";
    } else {
      blob = await canvasToBlob(src.canvas, "image/png");
      note = "PNG";
    }
    if (!blob) { setError("webpToPngStatus", "This browser could not encode PNG. Please try again."); return; }
    downloadBlob(blob, "ak-premium-webp-to-png.png");
    setStatus("webpToPngStatus", "Done. " + note + " downloaded (" + src.canvas.width + " x " + src.canvas.height + " px" + (src.orientation > 1 ? ", rotation fixed from photo data" : "") + ").");
  } catch (e) { setError("webpToPngStatus", (e && e.message && e.message.indexOf("did not load") !== -1) ? e.message : "Could not convert this image. Please try a WebP file."); }
});

/* JPG to WebP: quality slider, a best-quality mode, and a target-size mode
   that lowers the quality step by step until the file fits. EXIF
   orientation is applied on load. Browsers cannot save true lossless WebP
   from a canvas, so best quality uses the highest lossy setting. */
