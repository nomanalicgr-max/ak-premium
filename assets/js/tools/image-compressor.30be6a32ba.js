/* AK Premium v12 — image-compressor (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 1 handlers: Image ---------- */

const imgCompressQuality = $("imgCompressQuality");
if (imgCompressQuality) imgCompressQuality.addEventListener("input", () => {
  const label = $("imgCompressQualityLabel"); if (label) label.textContent = imgCompressQuality.value + "%";
});
/* Does this browser save AVIF from a canvas? Chrome and Edge do; Safari
   and Firefox may not. Probed once, so the AVIF option can fail honestly
   instead of silently producing no file. */

const imgCompressBtn = $("imgCompressBtn");
if (imgCompressBtn) imgCompressBtn.addEventListener("click", async () => {
  const files = Array.from($("imgCompressInput").files || []);
  if (!files.length) { setError("imgCompressStatus", "Please select at least one image first."); return; }
  let quality = (parseInt(($("imgCompressQuality") || {}).value || "80", 10) || 80) / 100;
  const format = $("imgCompressFormat") ? $("imgCompressFormat").value : "jpeg";
  const targetKB = $("imgCompressTargetKB") ? parseInt($("imgCompressTargetKB").value, 10) : 0;
  if (format === "avif" && !canvasSupportsAvif()) { setError("imgCompressStatus", "This browser cannot save AVIF images. Try WebP instead — it is almost as small and opens everywhere."); return; }
  const mime = format === "png" ? "image/png" : format === "webp" ? "image/webp" : format === "avif" ? "image/avif" : "image/jpeg";
  const ext = format === "png" ? "png" : format === "webp" ? "webp" : format === "avif" ? "avif" : "jpg";
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
      if (!blob) { setError("imgCompressStatus", "This browser could not encode that format. Please try again."); return; }
      const name = "ak-premium-compressed-" + (i + 1) + "." + ext; blobs.push({ name, blob });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
      a.textContent = "Download " + name;
      if (out) {
        const wrap = document.createElement("div");
        wrap.className = "img-result";
        const thumb = document.createElement("img");
        thumb.src = URL.createObjectURL(blob); thumb.alt = "Compressed preview of " + files[i].name; thumb.style.maxWidth = "220px";
        const line = document.createElement("p");
        const saved = files[i].size > 0 ? Math.round((1 - blob.size / files[i].size) * 100) : 0;
        line.textContent = files[i].name + ": " + humanBytes(files[i].size) + " \u2192 " + humanBytes(blob.size) + (saved >= 0 ? " (saved " + saved + "%)" : " (grew " + Math.abs(saved) + "%)");
        wrap.appendChild(thumb); wrap.appendChild(line); wrap.appendChild(a);
        out.appendChild(wrap);
      }
    }
    if (window.JSZip && blobs.length > 1) {
      const zip = new window.JSZip(); blobs.forEach((b) => zip.file(b.name, b.blob));
      downloadBlob(await zip.generateAsync({ type: "blob" }), "ak-premium-compressed.zip");
      setStatus("imgCompressStatus", "Done. " + blobs.length + " image(s) compressed and downloaded as a ZIP. " + imgCompressFormatNote(format));
    } else {
      setStatus("imgCompressStatus", "Done. " + imgCompressFormatNote(format));
    }
  } catch (e) { setError("imgCompressStatus", "Could not compress these images. Please try JPG or PNG files."); }
});

let resizeOriginal = null;
