/* AK Premium v9 — bundle-image (split from app.js, Phase 4.3). Loads after core.js. */

/* ---------- Phase 1 handlers: Image ---------- */

const imgCompressQuality = $("imgCompressQuality");
if (imgCompressQuality) imgCompressQuality.addEventListener("input", () => {
  const label = $("imgCompressQualityLabel"); if (label) label.textContent = imgCompressQuality.value + "%";
});

const imgCompressBtn = $("imgCompressBtn");
if (imgCompressBtn) imgCompressBtn.addEventListener("click", async () => {
  const files = Array.from($("imgCompressInput").files || []);
  if (!files.length) { setStatus("imgCompressStatus", "Please select at least one image first."); return; }
  let quality = (parseInt(($("imgCompressQuality") || {}).value || "80", 10) || 80) / 100;
  const format = $("imgCompressFormat") ? $("imgCompressFormat").value : "jpeg";
  const targetKB = $("imgCompressTargetKB") ? parseInt($("imgCompressTargetKB").value, 10) : 0;
  const mime = format === "png" ? "image/png" : format === "webp" ? "image/webp" : "image/jpeg";
  const ext = format === "png" ? "png" : format === "webp" ? "webp" : "jpg";
  const out = $("imgCompressOutput"); if (out) out.innerHTML = "";
  setStatus("imgCompressStatus", "Compressing " + files.length + " image(s)...");
  try {
    const blobs = [];
    for (let i = 0; i < files.length; i++) {
      const img = await loadImageFromFile(files[i]);
      const canvas = document.createElement("canvas"); canvas.width = img.naturalWidth || img.width; canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (format === "jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      ctx.drawImage(img, 0, 0);
      let q = quality, blob = null;
      /* Target size: lower quality in steps until the file fits (JPEG/WebP only). */
      for (let attempt = 0; attempt < 8; attempt++) {
        blob = await canvasToBlob(canvas, mime, q);
        if (!blob) break;
        if (!targetKB || format === "png" || blob.size <= targetKB * 1024 || q <= 0.1) break;
        q = Math.max(0.1, q - 0.1);
      }
      if (!blob) { setStatus("imgCompressStatus", "This browser could not encode that format. Please try again."); return; }
      const name = "ak-premium-compressed-" + (i + 1) + "." + ext; blobs.push({ name, blob });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
      a.textContent = "Download " + name + " (" + humanBytes(files[i].size) + " -> " + humanBytes(blob.size) + ")";
      if (out) { out.appendChild(a); out.appendChild(document.createElement("br")); }
    }
    if (window.JSZip && blobs.length > 1) {
      const zip = new window.JSZip(); blobs.forEach((b) => zip.file(b.name, b.blob));
      downloadBlob(await zip.generateAsync({ type: "blob" }), "ak-premium-compressed.zip");
      setStatus("imgCompressStatus", "Done. " + blobs.length + " image(s) compressed and downloaded as a ZIP. " + (format === "jpeg" ? "JPEG output flattens transparency." : format === "png" ? "PNG keeps transparency but may stay large." : "WebP keeps good quality at small sizes."));
    } else {
      setStatus("imgCompressStatus", "Done. " + (format === "jpeg" ? "JPEG output flattens transparency." : format === "png" ? "PNG keeps transparency but may stay large." : "WebP keeps good quality at small sizes."));
    }
  } catch (e) { setStatus("imgCompressStatus", "Could not compress these images. Please try JPG or PNG files."); }
});

let resizeOriginal = null;

const imgResizeInput = $("imgResizeInput");
if (imgResizeInput) imgResizeInput.addEventListener("change", async () => {
  const file = (imgResizeInput.files || [])[0]; if (!file) return;
  try {
    const img = await loadImageFromFile(file);
    resizeOriginal = { w: img.naturalWidth || img.width, h: img.naturalHeight || img.height };
    if ($("imgResizeWidth")) $("imgResizeWidth").value = resizeOriginal.w;
    if ($("imgResizeHeight")) $("imgResizeHeight").value = resizeOriginal.h;
    setStatus("imgResizeStatus", "Original size: " + resizeOriginal.w + " x " + resizeOriginal.h + " px.");
  } catch (e) { setStatus("imgResizeStatus", "Could not read this image."); }
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
  if (!file) { setStatus("imgResizeStatus", "Please select an image first."); return; }
  const w = parseInt($("imgResizeWidth").value, 10), h = parseInt($("imgResizeHeight").value, 10);
  if (!w || !h || w < 1 || h < 1 || w > 8000 || h > 8000) { setStatus("imgResizeStatus", "Please enter a width and height between 1 and 8000 px."); return; }
  const format = $("imgResizeFormat").value;
  try {
    const img = await loadImageFromFile(file);
    const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (format === "jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h); }
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await canvasToBlob(canvas, format === "jpeg" ? "image/jpeg" : "image/png", 0.92);
    if (!blob) { setStatus("imgResizeStatus", "This browser could not encode this format."); return; }
    downloadBlob(blob, "ak-premium-resized." + format);
    setStatus("imgResizeStatus", "Done. Resized image downloaded (" + w + " x " + h + " px).");
  } catch (e) { setStatus("imgResizeStatus", "Could not resize this image."); }
});

const imgConvertBtn = $("imgConvertBtn");
if (imgConvertBtn) imgConvertBtn.addEventListener("click", async () => {
  const file = ($("imgConvertInput").files || [])[0];
  if (!file) { setStatus("imgConvertStatus", "Please select an image first."); return; }
  const format = $("imgConvertFormat").value;
  const mime = format === "jpg" ? "image/jpeg" : (format === "png" ? "image/png" : "image/webp");
  try {
    const img = await loadImageFromFile(file);
    const canvas = document.createElement("canvas"); canvas.width = img.naturalWidth || img.width; canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    if (mime === "image/jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.drawImage(img, 0, 0);
    const blob = await canvasToBlob(canvas, mime, 0.92);
    if (!blob) { setStatus("imgConvertStatus", "This browser cannot encode " + format.toUpperCase() + ". Please choose PNG or JPG."); return; }
    downloadBlob(blob, "ak-premium-converted." + format);
    setStatus("imgConvertStatus", "Done. Converted image downloaded.");
  } catch (e) { setStatus("imgConvertStatus", "Could not convert this image."); }
});

const ocrBtn = $("ocrBtn");
if (ocrBtn) ocrBtn.addEventListener("click", async () => {
  const file = ($("ocrInput").files || [])[0];
  if (!file) { setStatus("ocrStatus", "Please select an image first."); return; }
  if (!window.Tesseract) { setStatus("ocrStatus", "OCR library (Tesseract.js) did not load. Check your connection and try again."); return; }
  setStatus("ocrStatus", "Working… first run downloads language data and may take time.");
  try {
    const lang = $("ocrLang") ? $("ocrLang").value : "eng";
    const result = await window.Tesseract.recognize(file, lang, {
      logger: (m) => { if (m && m.status === "recognizing text" && typeof m.progress === "number") { setStatus("ocrStatus", "Working... " + Math.round(m.progress * 100) + "%."); setProgress("ocrProgress", Math.round(m.progress * 100)); } }
    });
    setProgress("ocrProgress", 100);
    const text = (result && result.data && result.data.text ? result.data.text : "").trim();
    if ($("ocrOutput")) $("ocrOutput").textContent = text || "(No text recognized in this image.)";
    setStatus("ocrStatus", text ? "Done. Text recognized." : "Done. No text recognized in this image.");
  } catch (e) { setStatus("ocrStatus", "OCR failed. Please try a clear image with printed text."); }
});

const ocrCopyBtn = $("ocrCopyBtn");
if (ocrCopyBtn) ocrCopyBtn.addEventListener("click", () => {
  const text = $("ocrOutput") ? $("ocrOutput").textContent : "";
  if (!text || text.startsWith("Recognized text")) { setStatus("ocrStatus", "Read text from an image first, then use Copy."); return; }
  copyTextToClipboard(text, "ocrStatus");
});
