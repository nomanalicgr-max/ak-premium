/* AK Premium v12 — images-to-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- PDF Studio ---------- */

const imagesPdfBtn = $("imagesPdfBtn");
if (imagesPdfBtn) imagesPdfBtn.addEventListener("click", async () => {
  const JsPDF = getJsPdf();
  if (!needLibrary(!!JsPDF, "jsPDF", "imagesPdfStatus")) return;
  const files = Array.from($("imagesInput").files || []);
  if (!files.length) { setError("imagesPdfStatus", "Please select at least one JPG, PNG or WebP image."); return; }
  setStatus("imagesPdfStatus", "Converting " + files.length + " image(s)…");
  try {
    const doc = new JsPDF();
    for (let i = 0; i < files.length; i++) {
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(files[i]);
      });
      const img = new Image();
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = dataUrl; });
      if (i > 0) doc.addPage();
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const ratio = Math.min((pageW - 20) / img.width, (pageH - 20) / img.height);
      const w = img.width * ratio, h = img.height * ratio;
      // Re-encode through a canvas as PNG: jsPDF cannot reliably add WebP
      // (or some PNG variants) directly, which previously failed silently
      // for WebP uploads even though WebP is listed as accepted.
      const canvas = document.createElement("canvas");
      canvas.width = img.width; canvas.height = img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      doc.addImage(canvas.toDataURL("image/png"), "PNG", (pageW - w) / 2, (pageH - h) / 2, w, h);
    }
    doc.save("ak-premium-images.pdf");
    setStatus("imagesPdfStatus", "Done. PDF downloaded.");
  } catch (e) { if (!setPdfError("imagesPdfStatus", e)) setError("imagesPdfStatus", "Could not convert these images. Please try JPG or PNG files and try again."); }
});
