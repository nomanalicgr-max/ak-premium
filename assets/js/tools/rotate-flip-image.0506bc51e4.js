/* AK Premium v12 — rotate-flip-image (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Image tools (batch 2) ---------- */

const rotateFlipInput = $("rotateFlipInput");
let rotateFlipState = null; /* {img, rot:0-3, flipH, flipV} */
const rotateFlipDraw = () => {
  const canvas = $("rotateFlipCanvas"); if (!canvas || !rotateFlipState) return;
  const s = rotateFlipState;
  const out = renderRotatedImage(s.img, s.rot, s.flipH, s.flipV, false);
  canvas.width = out.width; canvas.height = out.height;
  canvas.getContext("2d").drawImage(out, 0, 0);
};
if (rotateFlipInput) rotateFlipInput.addEventListener("change", async () => {
  const file = (rotateFlipInput.files || [])[0]; if (!file) return;
  if (!checkFileSize(file, "rotateFlipStatus")) return;
  try {
    const img = await loadImageFromFile(file);
    rotateFlipState = { img: img, rot: 0, flipH: false, flipV: false };
    rotateFlipDraw();
    setStatus("rotateFlipStatus", "Image loaded: " + (img.naturalWidth || img.width) + " x " + (img.naturalHeight || img.height) + " px. Use Rotate or Flip, then Download Image.");
  } catch (e) { setError("rotateFlipStatus", "Could not read this image. Please try a JPG, PNG or WebP file."); }
});

const rotateLeftBtn = $("rotateLeftBtn");
if (rotateLeftBtn) rotateLeftBtn.addEventListener("click", () => {
  if (!rotateFlipState) { setError("rotateFlipStatus", "Choose an image first."); return; }
  rotateFlipState.rot = (rotateFlipState.rot + 3) % 4; rotateFlipDraw();
  setStatus("rotateFlipStatus", "Rotated left.");
});

const rotateRightBtn = $("rotateRightBtn");
if (rotateRightBtn) rotateRightBtn.addEventListener("click", () => {
  if (!rotateFlipState) { setError("rotateFlipStatus", "Choose an image first."); return; }
  rotateFlipState.rot = (rotateFlipState.rot + 1) % 4; rotateFlipDraw();
  setStatus("rotateFlipStatus", "Rotated right.");
});

const flipHBtn = $("flipHBtn");
if (flipHBtn) flipHBtn.addEventListener("click", () => {
  if (!rotateFlipState) { setError("rotateFlipStatus", "Choose an image first."); return; }
  rotateFlipState.flipH = !rotateFlipState.flipH; rotateFlipDraw();
  setStatus("rotateFlipStatus", rotateFlipState.flipH ? "Flipped horizontally." : "Horizontal flip removed.");
});

const flipVBtn = $("flipVBtn");
if (flipVBtn) flipVBtn.addEventListener("click", () => {
  if (!rotateFlipState) { setError("rotateFlipStatus", "Choose an image first."); return; }
  rotateFlipState.flipV = !rotateFlipState.flipV; rotateFlipDraw();
  setStatus("rotateFlipStatus", rotateFlipState.flipV ? "Flipped vertically." : "Vertical flip removed.");
});

const rotateFlipBtn = $("rotateFlipBtn");
if (rotateFlipBtn) rotateFlipBtn.addEventListener("click", async () => {
  if (!rotateFlipState) { setError("rotateFlipStatus", "Please select an image first."); return; }
  const format = ($("rotateFlipFormat") || {}).value || "png";
  const jpeg = format === "jpeg";
  try {
    const s = rotateFlipState;
    const canvas = renderRotatedImage(s.img, s.rot, s.flipH, s.flipV, jpeg);
    const blob = await canvasToBlob(canvas, jpeg ? "image/jpeg" : "image/png", 0.92);
    if (!blob) { setError("rotateFlipStatus", "This browser could not encode this format."); return; }
    downloadBlob(blob, "ak-premium-rotated." + (jpeg ? "jpg" : "png"));
    setStatus("rotateFlipStatus", "Done. Image downloaded (" + canvas.width + " x " + canvas.height + " px).");
  } catch (e) { setError("rotateFlipStatus", "Could not save this image. Please try again."); }
});
