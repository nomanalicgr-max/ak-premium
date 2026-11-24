/* AK Premium v12 — jpg-to-webp (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Image tools (batch 2) ---------- */

const jpgToWebpQuality = $("jpgToWebpQuality");
if (jpgToWebpQuality) jpgToWebpQuality.addEventListener("input", () => {
  const label = $("jpgToWebpQualityLabel"); if (label) label.textContent = jpgToWebpQuality.value + "%";
});

const jpgToWebpBtn = $("jpgToWebpBtn");
if (jpgToWebpBtn) jpgToWebpBtn.addEventListener("click", async () => {
  const file = ($("jpgToWebpInput").files || [])[0];
  if (!file) { setError("jpgToWebpStatus", "Please select a JPG image first."); return; }
  if (!checkFileSize(file, "jpgToWebpStatus")) return;
  const lossless = !!($("jpgToWebpLossless") || {}).checked;
  const quality = (parseInt(($("jpgToWebpQuality") || {}).value || "92", 10) || 92) / 100;
  const targetKB = ($("jpgToWebpTargetKB") || {}).value ? parseInt($("jpgToWebpTargetKB").value, 10) : 0;
  setStatus("jpgToWebpStatus", "Converting…");
  try {
    const src = await orientedCanvasFromFile(file);
    let q = lossless ? 1 : quality, blob = null, usedQ = q;
    for (let attempt = 0; attempt < 8; attempt++) {
      usedQ = q;
      blob = await canvasToBlob(src.canvas, "image/webp", q);
      if (!blob) break;
      if (!targetKB || blob.size <= targetKB * 1024 || q <= 0.1) break;
      q = Math.max(0.1, q - 0.1);
    }
    if (!blob) { setError("jpgToWebpStatus", "This browser could not encode WebP. Please choose PNG or JPG instead."); return; }
    downloadBlob(blob, "ak-premium-jpg-to-webp.webp");
    setStatus("jpgToWebpStatus", "Done. WebP downloaded (" + src.canvas.width + " x " + src.canvas.height + " px" + (lossless ? ", best quality" : ", quality " + Math.round(usedQ * 100) + "%") + (targetKB && blob.size <= targetKB * 1024 ? ", under " + targetKB + " KB" : "") + (src.orientation > 1 ? ", rotation fixed from photo data" : "") + ").");
  } catch (e) { setError("jpgToWebpStatus", "Could not convert this image. Please try a JPG file."); }
});

/* Intrinsic pixel size of an SVG document from its width/height attributes
   or its viewBox. Falls back to 1024 x 1024 when the SVG names no size.
   Pure, no ids; routed to the svg-to-png bundle (split-app.py TOOL_NAMES). */
