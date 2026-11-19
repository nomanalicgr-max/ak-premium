/* AK Premium v12 — svg-to-png (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Image tools (batch 2) ---------- */

const svgToPngBtn = $("svgToPngBtn");
if (svgToPngBtn) svgToPngBtn.addEventListener("click", async () => {
  const file = ($("svgToPngInput").files || [])[0];
  if (!file) { setError("svgToPngStatus", "Please select an SVG file first."); return; }
  if (!checkFileSize(file, "svgToPngStatus")) return;
  const w = parseInt(($("svgToPngWidth") || {}).value || "1024", 10);
  if (!w || w < 16 || w > 8000) { setError("svgToPngStatus", "Please enter a width between 16 and 8000 px."); return; }
  setStatus("svgToPngStatus", "Converting…");
  try {
    const text = await file.text();
    if (!/<svg[\s>]/.test(text)) { setError("svgToPngStatus", "This file does not look like an SVG. Please choose an .svg file."); return; }
    const url = URL.createObjectURL(new Blob([text], { type: "image/svg+xml" }));
    const img = new Image();
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = () => reject(new Error("svg load failed")); img.src = url; });
    URL.revokeObjectURL(url);
    let sw = img.naturalWidth, sh = img.naturalHeight;
    if (!sw || !sh) {
      const vb = text.match(/viewBox\s*=\s*["']([\d.\s,-]+)["']/i);
      if (vb) { const parts = vb[1].trim().split(/[\s,]+/).map(Number); if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) { sw = parts[2]; sh = parts[3]; } }
    }
    if (!sw || !sh) { sw = 1024; sh = 1024; }
    const h = Math.max(1, Math.round((w * sh) / sw));
    const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await canvasToBlob(canvas, "image/png");
    if (!blob) { setError("svgToPngStatus", "This browser could not make the PNG. Please try again."); return; }
    downloadBlob(blob, "ak-premium-svg-to-png.png");
    setStatus("svgToPngStatus", "Done. PNG downloaded (" + w + " x " + h + " px).");
  } catch (e) { setError("svgToPngStatus", "Could not convert this SVG. It may use an external image or font that cannot be loaded here."); }
});
