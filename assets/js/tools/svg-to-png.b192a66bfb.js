/* AK Premium v12 — svg-to-png (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Image tools (batch 2) ---------- */

function svgIntrinsicSize(text) {
  let w = 0, h = 0;
  const wm = text.match(/<svg[^>]*\bwidth\s*=\s*["']([\d.]+)(?:px)?["']/i);
  const hm = text.match(/<svg[^>]*\bheight\s*=\s*["']([\d.]+)(?:px)?["']/i);
  if (wm) w = parseFloat(wm[1]);
  if (hm) h = parseFloat(hm[1]);
  if (!w || !h) {
    const vb = text.match(/viewBox\s*=\s*["']([\d.\s,-]+)["']/i);
    if (vb) { const parts = vb[1].trim().split(/[\s,]+/).map(Number); if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) { if (!w) w = parts[2]; if (!h) h = parts[3]; } }
  }
  if (!w || !h) { w = w || 1024; h = h || 1024; }
  return { w: w, h: h };
}

const svgToPngBtn = $("svgToPngBtn");
if (svgToPngBtn) svgToPngBtn.addEventListener("click", async () => {
  const file = ($("svgToPngInput").files || [])[0];
  if (!file) { setError("svgToPngStatus", "Please select an SVG file first."); return; }
  if (!checkFileSize(file, "svgToPngStatus")) return;
  const scale = parseFloat(($("svgToPngScale") || {}).value || "1") || 1;
  const icon = ($("svgToPngIcon") || {}).value || "";
  const format = ($("svgToPngFormat") || {}).value || "png";
  const bg = ($("svgToPngBg") || {}).value || "transparent";
  const mime = format === "jpg" ? "image/jpeg" : (format === "webp" ? "image/webp" : (format === "avif" ? "image/avif" : "image/png"));
  if (format === "avif" && !canvasSupportsAvif()) { setError("svgToPngStatus", "This browser cannot save AVIF images. Please choose PNG, JPG or WebP."); return; }
  let w = parseInt(($("svgToPngWidth") || {}).value || "", 10);
  let h = parseInt(($("svgToPngHeight") || {}).value || "", 10);
  setStatus("svgToPngStatus", "Converting...");
  try {
    const text = await file.text();
    if (!/<svg[\s>]/.test(text)) { setError("svgToPngStatus", "This file does not look like an SVG. Please choose an .svg file."); return; }
    const dims = svgIntrinsicSize(text);
    if (icon) { w = parseInt(icon, 10); h = w; }
    else if (!w && !h) { w = Math.max(1, Math.round(dims.w * scale)); h = Math.max(1, Math.round(dims.h * scale)); }
    else if (w && !h) { h = Math.max(1, Math.round((w * dims.h) / dims.w)); }
    else if (!w && h) { w = Math.max(1, Math.round((h * dims.w) / dims.h)); }
    if (!w || !h || w < 1 || h < 1 || w > 8000 || h > 8000) { setError("svgToPngStatus", "Please enter a width and height between 1 and 8000 px."); return; }
    const url = URL.createObjectURL(new Blob([text], { type: "image/svg+xml" }));
    const img = new Image();
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = () => reject(new Error("svg load failed")); img.src = url; });
    URL.revokeObjectURL(url);
    const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (mime === "image/jpeg" || bg !== "transparent") { ctx.fillStyle = bg === "custom" ? (($("svgToPngBgColor") || {}).value || "#ffffff") : "#ffffff"; ctx.fillRect(0, 0, w, h); }
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await canvasToBlob(canvas, mime, 0.92);
    if (!blob) { setError("svgToPngStatus", "This browser could not make the " + format.toUpperCase() + ". Please try again."); return; }
    downloadBlob(blob, "ak-premium-svg-to-" + format + "." + (format === "jpg" ? "jpg" : format));
    setStatus("svgToPngStatus", "Done. " + format.toUpperCase() + " downloaded (" + w + " x " + h + " px).");
  } catch (e) { setError("svgToPngStatus", "Could not convert this SVG. It may use an external image or font that cannot be loaded here."); }
});
