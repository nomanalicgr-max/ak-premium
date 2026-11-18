/* AK Premium v12 — image-resizer (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 1 handlers: Image ---------- */

const imgResizeInput = $("imgResizeInput");
if (imgResizeInput) imgResizeInput.addEventListener("change", async () => {
  const file = (imgResizeInput.files || [])[0]; if (!file) return;
  try {
    const img = await loadImageFromFile(file);
    resizeOriginal = { w: img.naturalWidth || img.width, h: img.naturalHeight || img.height };
    if ($("imgResizeWidth")) $("imgResizeWidth").value = resizeOriginal.w;
    if ($("imgResizeHeight")) $("imgResizeHeight").value = resizeOriginal.h;
    setStatus("imgResizeStatus", "Original size: " + resizeOriginal.w + " x " + resizeOriginal.h + " px.");
  } catch (e) { setError("imgResizeStatus", "Could not read this image."); }
});

const imgResizeWidth = $("imgResizeWidth");
if (imgResizeWidth) imgResizeWidth.addEventListener("input", () => {
  if ($("imgResizeKeep") && $("imgResizeKeep").checked && resizeOriginal) {
    const w = parseInt(imgResizeWidth.value, 10);
    if (w > 0 && $("imgResizeHeight")) $("imgResizeHeight").value = Math.round((w * resizeOriginal.h) / resizeOriginal.w);
  }
});

const imgResizeHeight = $("imgResizeHeight");
if (imgResizeHeight) imgResizeHeight.addEventListener("input", () => {
  if ($("imgResizeKeep") && $("imgResizeKeep").checked && resizeOriginal) {
    const h = parseInt(imgResizeHeight.value, 10);
    if (h > 0 && $("imgResizeWidth")) $("imgResizeWidth").value = Math.round((h * resizeOriginal.w) / resizeOriginal.h);
  }
});

const imgResizeBtn = $("imgResizeBtn");
if (imgResizeBtn) imgResizeBtn.addEventListener("click", async () => {
  const file = ($("imgResizeInput").files || [])[0];
  if (!file) { setError("imgResizeStatus", "Please select an image first."); return; }
  const w = parseInt($("imgResizeWidth").value, 10), h = parseInt($("imgResizeHeight").value, 10);
  if (!w || !h || w < 1 || h < 1 || w > 8000 || h > 8000) { setError("imgResizeStatus", "Please enter a width and height between 1 and 8000 px."); return; }
  const format = $("imgResizeFormat").value;
  try {
    const img = await loadImageFromFile(file);
    const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (format === "jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h); }
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await canvasToBlob(canvas, format === "jpeg" ? "image/jpeg" : "image/png", 0.92);
    if (!blob) { setError("imgResizeStatus", "This browser could not encode this format."); return; }
    downloadBlob(blob, "ak-premium-resized." + format);
    setStatus("imgResizeStatus", "Done. Resized image downloaded (" + w + " x " + h + " px).");
  } catch (e) { setError("imgResizeStatus", "Could not resize this image."); }
});
