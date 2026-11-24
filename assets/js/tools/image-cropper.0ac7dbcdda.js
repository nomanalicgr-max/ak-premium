/* AK Premium v12 — image-cropper (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Image tools (batch 2) ---------- */

const imgCropInput = $("imgCropInput");
let imgCropper = null; /* Cropper.js instance */
let imgCropFlip = { x: 1, y: 1 };
/* Apply the aspect preset + lock to the live Cropper instance. Pure wiring
   for the cropper page; routed to the image-cropper bundle (TOOL_NAMES). */

function applyCropAspect() {
  if (!imgCropper) return;
  const v = ($("imgCropAspect") || {}).value || "free";
  const lock = $("imgCropLock") && $("imgCropLock").checked;
  if (v !== "free") { const parts = v.split("/").map(Number); if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) imgCropper.setAspectRatio(parts[0] / parts[1]); }
  else if (lock) { const d = imgCropper.getData(); if (d && d.width && d.height) imgCropper.setAspectRatio(d.width / d.height); }
  else imgCropper.setAspectRatio(NaN);
}
if (imgCropInput) imgCropInput.addEventListener("change", async () => {
  const file = (imgCropInput.files || [])[0]; if (!file) return;
  if (!checkFileSize(file, "imgCropStatus")) return;
  if (!window.Cropper) {
    const ok = await loadLibrary("cropperjs", "imgCropStatus");
    if (!ok || !window.Cropper) { setError("imgCropStatus", "Cropper library (Cropper.js) did not load. Check your connection and try again."); return; }
  }
  try {
    const img = $("imgCropImg");
    if (!img) { setError("imgCropStatus", "The crop preview could not be shown. Please reload the page and try again."); return; }
    if (imgCropper) { imgCropper.destroy(); imgCropper = null; }
    imgCropFlip = { x: 1, y: 1 };
    if ($("imgCropStraighten")) $("imgCropStraighten").value = 0;
    const url = URL.createObjectURL(file);
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = () => reject(new Error("image load failed")); img.src = url; });
    img.style.display = "";
    imgCropper = new window.Cropper(img, {
      viewMode: 1, autoCropArea: 0.8, responsive: true, background: false,
      guides: true, center: true, highlight: true, movable: true, zoomable: true,
      cropBoxMovable: true, cropBoxResizable: true, toggleDragModeOnDblclick: false,
      crop: (e) => {
        const d = e.detail || {};
        const setVal = (id, v) => { const el = $(id); if (el) el.value = Math.round(v || 0); };
        setVal("imgCropX", d.x); setVal("imgCropY", d.y); setVal("imgCropW", d.width); setVal("imgCropH", d.height);
      }
    });
    applyCropAspect();
    setStatus("imgCropStatus", "Image loaded: " + (img.naturalWidth || "?") + " x " + (img.naturalHeight || "?") + " px. Drag the box to choose the crop area.");
  } catch (e) { setError("imgCropStatus", "Could not read this image. Please try a JPG, PNG or WebP file."); }
});

const imgCropAspect = $("imgCropAspect");
if (imgCropAspect) imgCropAspect.addEventListener("change", applyCropAspect);

const imgCropLock = $("imgCropLock");
if (imgCropLock) imgCropLock.addEventListener("change", applyCropAspect);

const imgCropStraighten = $("imgCropStraighten");
if (imgCropStraighten) imgCropStraighten.addEventListener("input", () => {
  if (!imgCropper) { setError("imgCropStatus", "Choose an image first."); return; }
  imgCropper.rotateTo(parseFloat(imgCropStraighten.value) || 0);
});

const imgCropRotateLeft = $("imgCropRotateLeft");
if (imgCropRotateLeft) imgCropRotateLeft.addEventListener("click", () => {
  if (!imgCropper) { setError("imgCropStatus", "Choose an image first."); return; }
  imgCropper.rotate(-90);
});

const imgCropRotateRight = $("imgCropRotateRight");
if (imgCropRotateRight) imgCropRotateRight.addEventListener("click", () => {
  if (!imgCropper) { setError("imgCropStatus", "Choose an image first."); return; }
  imgCropper.rotate(90);
});

const imgCropFlipH = $("imgCropFlipH");
if (imgCropFlipH) imgCropFlipH.addEventListener("click", () => {
  if (!imgCropper) { setError("imgCropStatus", "Choose an image first."); return; }
  imgCropFlip.x = -imgCropFlip.x; imgCropper.scaleX(imgCropFlip.x);
});

const imgCropFlipV = $("imgCropFlipV");
if (imgCropFlipV) imgCropFlipV.addEventListener("click", () => {
  if (!imgCropper) { setError("imgCropStatus", "Choose an image first."); return; }
  imgCropFlip.y = -imgCropFlip.y; imgCropper.scaleY(imgCropFlip.y);
});

const imgCropX = $("imgCropX");
if (imgCropX) ["imgCropX", "imgCropY", "imgCropW", "imgCropH"].forEach((id) => {
  const el = $(id);
  if (el) el.addEventListener("change", () => {
    if (!imgCropper) return;
    const v = (i) => parseInt(($(i) || {}).value || "0", 10) || 0;
    imgCropper.setData({ x: v("imgCropX"), y: v("imgCropY"), width: Math.max(1, v("imgCropW")), height: Math.max(1, v("imgCropH")) });
  });
});

const imgCropResetBtn = $("imgCropResetBtn");
if (imgCropResetBtn) imgCropResetBtn.addEventListener("click", () => {
  if (imgCropper) { imgCropper.destroy(); imgCropper = null; }
  const img = $("imgCropImg"); if (img) { img.removeAttribute("src"); img.style.display = "none"; }
  if ($("imgCropInput")) $("imgCropInput").value = "";
  ["imgCropX", "imgCropY", "imgCropW", "imgCropH"].forEach((id) => { const el = $(id); if (el) el.value = ""; });
  if ($("imgCropStraighten")) $("imgCropStraighten").value = 0;
  setStatus("imgCropStatus", "Start over: choose an image to crop.");
});

const imgCropBtn = $("imgCropBtn");
if (imgCropBtn) imgCropBtn.addEventListener("click", async () => {
  if (!imgCropper) { setError("imgCropStatus", "Please select an image first."); return; }
  const format = ($("imgCropFormat") || {}).value || "png";
  const quality = parseFloat(($("imgCropQuality") || {}).value || "0.92") || 0.92;
  const mime = format === "jpg" ? "image/jpeg" : (format === "webp" ? "image/webp" : "image/png");
  try {
    const cropped = imgCropper.getCroppedCanvas();
    if (!cropped || !cropped.width || !cropped.height) { setError("imgCropStatus", "Drag on the preview to choose an area first."); return; }
    let canvas = cropped;
    if (mime === "image/jpeg") {
      const filled = document.createElement("canvas"); filled.width = cropped.width; filled.height = cropped.height;
      const fctx = filled.getContext("2d"); fctx.fillStyle = "#ffffff"; fctx.fillRect(0, 0, filled.width, filled.height); fctx.drawImage(cropped, 0, 0);
      canvas = filled;
    }
    const blob = await canvasToBlob(canvas, mime, quality);
    if (!blob) { setError("imgCropStatus", "This browser could not make the " + format.toUpperCase() + ". Please try again."); return; }
    downloadBlob(blob, "ak-premium-cropped." + (format === "jpg" ? "jpg" : format));
    setStatus("imgCropStatus", "Done. Cropped " + format.toUpperCase() + " downloaded (" + canvas.width + " x " + canvas.height + " px).");
  } catch (e) { setError("imgCropStatus", "Could not crop this image. Please try again."); }
});
