/* AK Premium v12 — jpg-to-png (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Image tools (batch 2) ---------- */

const jpgToPngBtn = $("jpgToPngBtn");
if (jpgToPngBtn) jpgToPngBtn.addEventListener("click", async () => {
  const file = ($("jpgToPngInput").files || [])[0];
  if (!file) { setError("jpgToPngStatus", "Please select a JPG image first."); return; }
  if (!checkFileSize(file, "jpgToPngStatus")) return;
  const png8 = !!($("jpgToPngPng8") || {}).checked;
  setStatus("jpgToPngStatus", "Converting…");
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
    if (!blob) { setError("jpgToPngStatus", "This browser could not encode PNG. Please try again."); return; }
    downloadBlob(blob, "ak-premium-jpg-to-png.png");
    setStatus("jpgToPngStatus", "Done. " + note + " downloaded (" + src.canvas.width + " x " + src.canvas.height + " px" + (src.orientation > 1 ? ", rotation fixed from photo data" : "") + ").");
  } catch (e) { setError("jpgToPngStatus", (e && e.message && e.message.indexOf("did not load") !== -1) ? e.message : "Could not convert this image. Please try a JPG file."); }
});

/* WebP to JPG: quality slider + a background colour for the see-through
   parts. EXIF orientation is applied on load. */
