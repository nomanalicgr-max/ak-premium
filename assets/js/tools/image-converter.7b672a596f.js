/* AK Premium v12 — image-converter (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 1 handlers: Image ---------- */

const imgConvertBtn = $("imgConvertBtn");
if (imgConvertBtn) imgConvertBtn.addEventListener("click", async () => {
  const file = ($("imgConvertInput").files || [])[0];
  if (!file) { setError("imgConvertStatus", "Please select an image first."); return; }
  const format = $("imgConvertFormat").value;
  const mime = format === "jpg" ? "image/jpeg" : (format === "png" ? "image/png" : "image/webp");
  try {
    const img = await loadImageFromFile(file);
    const canvas = document.createElement("canvas"); canvas.width = img.naturalWidth || img.width; canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    if (mime === "image/jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.drawImage(img, 0, 0);
    const blob = await canvasToBlob(canvas, mime, 0.92);
    if (!blob) { setError("imgConvertStatus", "This browser cannot encode " + format.toUpperCase() + ". Please choose PNG or JPG."); return; }
    downloadBlob(blob, "ak-premium-converted." + format);
    setStatus("imgConvertStatus", "Done. Converted image downloaded.");
  } catch (e) { setError("imgConvertStatus", "Could not convert this image."); }
});
