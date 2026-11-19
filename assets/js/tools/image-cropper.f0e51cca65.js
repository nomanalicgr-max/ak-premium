/* AK Premium v12 — image-cropper (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Image tools (batch 2) ---------- */

const imgCropInput = $("imgCropInput");
let imgCropState = null; /* {img, rect:{x,y,w,h}} */
const imgCropDraw = () => {
  const canvas = $("imgCropCanvas"); if (!canvas || !imgCropState) return;
  const ctx = canvas.getContext("2d"); if (!ctx) return;
  const img = imgCropState.img, r = imgCropState.rect;
  canvas.width = img.naturalWidth || img.width; canvas.height = img.naturalHeight || img.height;
  ctx.drawImage(img, 0, 0);
  ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, r.x, r.y, r.w, r.h, r.x, r.y, r.w, r.h);
  ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
  const setVal = (id, v) => { const el = $(id); if (el) el.value = Math.round(v); };
  setVal("imgCropX", r.x); setVal("imgCropY", r.y); setVal("imgCropW", r.w); setVal("imgCropH", r.h);
};
if (imgCropInput) imgCropInput.addEventListener("change", async () => {
  const file = (imgCropInput.files || [])[0]; if (!file) return;
  if (!checkFileSize(file, "imgCropStatus")) return;
  try {
    const img = await loadImageFromFile(file);
    imgCropState = { img: img, rect: { x: 0, y: 0, w: img.naturalWidth || img.width, h: img.naturalHeight || img.height } };
    const canvas = $("imgCropCanvas"); if (canvas) canvas.style.touchAction = "none";
    imgCropDraw();
    setStatus("imgCropStatus", "Image loaded: " + (img.naturalWidth || img.width) + " x " + (img.naturalHeight || img.height) + " px. Drag on the preview to choose the crop area.");
  } catch (e) { setError("imgCropStatus", "Could not read this image. Please try a JPG, PNG or WebP file."); }
});

const imgCropCanvas = $("imgCropCanvas");
if (imgCropCanvas) {
  let cropDrag = null;
  const cropPoint = (e) => {
    const rect = imgCropCanvas.getBoundingClientRect();
    const scale = imgCropCanvas.width / rect.width;
    return { x: (e.clientX - rect.left) * scale, y: (e.clientY - rect.top) * scale };
  };
  imgCropCanvas.addEventListener("pointerdown", (e) => {
    if (!imgCropState) { setError("imgCropStatus", "Choose an image first."); return; }
    const p = cropPoint(e); cropDrag = { x0: p.x, y0: p.y };
    imgCropCanvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  imgCropCanvas.addEventListener("pointermove", (e) => {
    if (!cropDrag || !imgCropState) return;
    const p = cropPoint(e);
    const img = imgCropState.img, iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const x = Math.max(0, Math.min(cropDrag.x0, p.x)), y = Math.max(0, Math.min(cropDrag.y0, p.y));
    const w = Math.max(0, Math.min(Math.abs(p.x - cropDrag.x0), iw - x)), h = Math.max(0, Math.min(Math.abs(p.y - cropDrag.y0), ih - y));
    imgCropState.rect = { x: x, y: y, w: w, h: h };
    imgCropDraw();
  });
  imgCropCanvas.addEventListener("pointerup", () => { cropDrag = null; });
}

const imgCropX = $("imgCropX");
if (imgCropX) ["imgCropX", "imgCropY", "imgCropW", "imgCropH"].forEach((id) => {
  const el = $(id);
  if (el) el.addEventListener("change", () => {
    if (!imgCropState) return;
    const img = imgCropState.img, iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const v = (i, max) => Math.max(0, Math.min(max, parseInt(($(i) || {}).value || "0", 10) || 0));
    const x = v("imgCropX", iw - 1), y = v("imgCropY", ih - 1);
    const w = Math.max(1, Math.min(v("imgCropW", iw), iw - x)), h = Math.max(1, Math.min(v("imgCropH", ih), ih - y));
    imgCropState.rect = { x: x, y: y, w: w, h: h };
    imgCropDraw();
  });
});

const imgCropBtn = $("imgCropBtn");
if (imgCropBtn) imgCropBtn.addEventListener("click", async () => {
  if (!imgCropState) { setError("imgCropStatus", "Please select an image first."); return; }
  const r = imgCropState.rect;
  if (!r || r.w < 1 || r.h < 1) { setError("imgCropStatus", "Drag on the preview to choose an area first."); return; }
  try {
    const canvas = document.createElement("canvas"); canvas.width = r.w; canvas.height = r.h;
    canvas.getContext("2d").drawImage(imgCropState.img, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
    const blob = await canvasToBlob(canvas, "image/png");
    if (!blob) { setError("imgCropStatus", "This browser could not make the PNG. Please try again."); return; }
    downloadBlob(blob, "ak-premium-cropped.png");
    setStatus("imgCropStatus", "Done. Cropped PNG downloaded (" + r.w + " x " + r.h + " px).");
  } catch (e) { setError("imgCropStatus", "Could not crop this image. Please try again."); }
});
