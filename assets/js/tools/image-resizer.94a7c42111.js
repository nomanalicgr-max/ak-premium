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
/* Crop rectangle for a target aspect ratio, centred on a face box when
   one is given and on the image centre otherwise. Pure geometry, no ids;
   routed to the image-resizer bundle (split-app.py TOOL_NAMES). */

function imgResizeFaceCropRect(imgW, imgH, targetW, targetH, faceBox) {
  const targetAspect = targetW / targetH;
  let cw, ch;
  if (imgW / imgH > targetAspect) { ch = imgH; cw = Math.round(imgH * targetAspect); }
  else { cw = imgW; ch = Math.round(imgW / targetAspect); }
  let cx, cy;
  if (faceBox) {
    cx = Math.round(faceBox.x + faceBox.width / 2 - cw / 2);
    cy = Math.round(faceBox.y + faceBox.height / 2 - ch / 2);
  } else { cx = Math.round((imgW - cw) / 2); cy = Math.round((imgH - ch) / 2); }
  cx = Math.max(0, Math.min(imgW - cw, cx));
  cy = Math.max(0, Math.min(imgH - ch, cy));
  return { x: cx, y: cy, w: cw, h: ch };
}

const imgResizePreset = $("imgResizePreset");
if (imgResizePreset) imgResizePreset.addEventListener("change", () => {
  const presets = {
    "ig-post": [1080, 1080], "ig-story": [1080, 1920], "fb-post": [1200, 630],
    "yt-thumb": [1280, 720], "li-post": [1200, 627], "wa-dp": [640, 640],
    "passport": [413, 531], "a4-300": [2480, 3508], "a4-150": [1240, 1754]
  };
  const p = presets[imgResizePreset.value];
  if (!p) return;
  if ($("imgResizeWidth")) $("imgResizeWidth").value = p[0];
  if ($("imgResizeHeight")) $("imgResizeHeight").value = p[1];
  if ($("imgResizeKeep")) $("imgResizeKeep").checked = false;
  setStatus("imgResizeStatus", "Preset size set: " + p[0] + " x " + p[1] + " px. Choose an image, then Resize.");
});

const imgResizeBtn = $("imgResizeBtn");
if (imgResizeBtn) imgResizeBtn.addEventListener("click", async () => {
  const file = ($("imgResizeInput").files || [])[0];
  if (!file) { setError("imgResizeStatus", "Please select an image first."); return; }
  const w = parseInt($("imgResizeWidth").value, 10), h = parseInt($("imgResizeHeight").value, 10);
  if (!w || !h || w < 1 || h < 1 || w > 8000 || h > 8000) { setError("imgResizeStatus", "Please enter a width and height between 1 and 8000 px."); return; }
  const format = $("imgResizeFormat") ? $("imgResizeFormat").value : "png";
  const quality = $("imgResizeQuality") ? parseFloat($("imgResizeQuality").value) || 0.92 : 0.92;
  const mime = format === "jpg" ? "image/jpeg" : (format === "webp" ? "image/webp" : (format === "avif" ? "image/avif" : "image/png"));
  if (format === "avif" && !canvasSupportsAvif()) { setError("imgResizeStatus", "This browser cannot save AVIF images. Please choose PNG, JPG or WebP."); return; }
  try {
    const img = await loadImageFromFile(file);
    const imgW = img.naturalWidth || img.width, imgH = img.naturalHeight || img.height;
    const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (format === "jpg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h); }
    let note = "";
    if ($("imgResizeFaceCrop") && $("imgResizeFaceCrop").checked) {
      let box = null;
      try {
        if (typeof window.FaceDetector === "function") {
          const faces = await new window.FaceDetector({ fastMode: true }).detect(img);
          if (faces && faces.length && faces[0].boundingBox) box = faces[0].boundingBox;
          else note = " No face was found, so the image was cropped from the centre instead.";
        } else {
          note = " Face-aware crop is not available in this browser (it needs Chrome), so the image was cropped from the centre instead.";
        }
      } catch (e) { note = " Face detection did not run in this browser, so the image was cropped from the centre instead."; }
      const r = imgResizeFaceCropRect(imgW, imgH, w, h, box);
      ctx.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, w, h);
    } else {
      ctx.drawImage(img, 0, 0, w, h);
    }
    const blob = await canvasToBlob(canvas, mime, quality);
    if (!blob) { setError("imgResizeStatus", "This browser could not encode " + format.toUpperCase() + ". Please choose PNG or JPG."); return; }
    downloadBlob(blob, "ak-premium-resized." + (format === "jpg" ? "jpg" : format));
    setStatus("imgResizeStatus", "Done. Resized image downloaded (" + w + " x " + h + " px)." + note);
  } catch (e) { setError("imgResizeStatus", "Could not resize this image."); }
});
