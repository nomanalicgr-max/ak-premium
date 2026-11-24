/* AK Premium v12 — rotate-flip-image (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Image tools (batch 2) ---------- */

const rotateFlipInput = $("rotateFlipInput");
let rotateFlipState = null; /* {img, rot:0-3, straighten:-45..45, flipH, flipV} */
let rotateFlipFiles = [];
const rotateFlipDraw = () => {
  const canvas = $("rotateFlipCanvas"); if (!canvas || !rotateFlipState) return;
  const s = rotateFlipState;
  const out = s.straighten ? renderArbitraryRotatedImage(s.img, s.rot * 90 + s.straighten, s.flipH, s.flipV) : renderRotatedImage(s.img, s.rot, s.flipH, s.flipV, false);
  canvas.width = out.width; canvas.height = out.height;
  canvas.getContext("2d").drawImage(out, 0, 0);
};
if (rotateFlipInput) rotateFlipInput.addEventListener("change", async () => {
  const files = Array.from(rotateFlipInput.files || []); if (!files.length) return;
  const file = files[0];
  if (!checkFileSize(file, "rotateFlipStatus")) return;
  try {
    let img = await loadImageFromFile(file);
    let exifNote = "";
    const orientation = await exifOrientationOfFile(file);
    if (orientation > 1) { img = orientedImageCanvas(img, orientation); exifNote = " EXIF orientation was applied, so the photo is shown the right way up."; }
    rotateFlipFiles = files;
    rotateFlipState = { img: img, rot: 0, straighten: 0, flipH: false, flipV: false };
    if ($("rotateFlipStraighten")) $("rotateFlipStraighten").value = 0;
    rotateFlipDraw();
    setStatus("rotateFlipStatus", "Image loaded: " + (img.naturalWidth || img.width) + " x " + (img.naturalHeight || img.height) + " px." + (files.length > 1 ? " " + files.length + " images loaded; the same rotation applies to all of them." : "") + exifNote + " Use Rotate or Flip, then Download Image.");
  } catch (e) { setError("rotateFlipStatus", "Could not read this image. Please try a JPG, PNG or WebP file."); }
});

const rotateFlipStraighten = $("rotateFlipStraighten");
if (rotateFlipStraighten) rotateFlipStraighten.addEventListener("input", () => {
  if (!rotateFlipState) { setError("rotateFlipStatus", "Choose an image first."); return; }
  rotateFlipState.straighten = parseFloat(rotateFlipStraighten.value) || 0;
  rotateFlipDraw();
  setStatus("rotateFlipStatus", "Straightened by " + rotateFlipState.straighten + " degrees.");
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
  const mime = format === "jpg" ? "image/jpeg" : (format === "webp" ? "image/webp" : "image/png");
  const ext = format === "jpg" ? "jpg" : format;
  try {
    const s = rotateFlipState;
    const files = rotateFlipFiles.length ? rotateFlipFiles : [];
    if (!files.length) { setError("rotateFlipStatus", "Please select an image first."); return; }
    const out = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!checkFileSize(f, "rotateFlipStatus")) return;
      if (files.length > 1) setStatus("rotateFlipStatus", "Rotating " + (i + 1) + " of " + files.length + "...");
      let img = await loadImageFromFile(f);
      const orientation = await exifOrientationOfFile(f);
      if (orientation > 1) img = orientedImageCanvas(img, orientation);
      let canvas = s.straighten ? renderArbitraryRotatedImage(img, s.rot * 90 + s.straighten, s.flipH, s.flipV) : renderRotatedImage(img, s.rot, s.flipH, s.flipV, false);
      if (format === "jpg") {
        const filled = document.createElement("canvas"); filled.width = canvas.width; filled.height = canvas.height;
        const fctx = filled.getContext("2d"); fctx.fillStyle = "#ffffff"; fctx.fillRect(0, 0, filled.width, filled.height); fctx.drawImage(canvas, 0, 0);
        canvas = filled;
      }
      const blob = await canvasToBlob(canvas, mime, 0.92);
      if (!blob) { setError("rotateFlipStatus", "This browser could not encode " + format.toUpperCase() + "."); return; }
      const base = (f.name || "image").replace(/\.[^.]+$/, "") || "image";
      out.push({ name: base + "-rotated." + ext, blob: blob, w: canvas.width, h: canvas.height });
    }
    if (out.length === 1) {
      downloadBlob(out[0].blob, out[0].name);
      setStatus("rotateFlipStatus", "Done. Image downloaded (" + out[0].w + " x " + out[0].h + " px).");
    } else {
      if (!window.JSZip) { setError("rotateFlipStatus", "The ZIP library did not load. Rotate one image at a time, or check your connection and try again."); return; }
      const zip = new window.JSZip();
      out.forEach((o) => zip.file(o.name, o.blob));
      downloadBlob(await zip.generateAsync({ type: "blob" }), "ak-premium-rotated.zip");
      setStatus("rotateFlipStatus", "Done. " + out.length + " image(s) rotated and downloaded as a ZIP.");
    }
  } catch (e) { setError("rotateFlipStatus", "Could not save this image. Please try again."); }
});
