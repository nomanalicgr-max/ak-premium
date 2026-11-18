/* AK Premium v12 — scan-to-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- New tools (all in browser) ---------- */

const scanPdfBtn = $("scanPdfBtn");
if (scanPdfBtn) scanPdfBtn.addEventListener("click", async () => {
  const file = ($("scanInput").files || [])[0]; if (!file) { setError("scanPdfStatus", "Please select a photo first."); return; }
  try {
    const JsPDF = getJsPdf(); if (!JsPDF) { setError("scanPdfStatus", "jsPDF did not load."); return; }
    const url = URL.createObjectURL(file); const img = new Image(); img.src = url; await img.decode();
    const canvas = document.createElement("canvas"); canvas.width = img.width; canvas.height = img.height; canvas.getContext("2d").drawImage(img, 0, 0);
    const doc = new JsPDF(); const pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight();
    const ratio = Math.min(pageW / img.width, pageH / img.height); const w = img.width * ratio, h = img.height * ratio;
    doc.addImage(canvas.toDataURL("image/png"), "PNG", (pageW-w)/2, (pageH-h)/2, w, h); doc.save("ak-premium-scan.pdf");
    setStatus("scanPdfStatus", "Done. Scan PDF downloaded.");
  } catch (e) { if (!setPdfError("scanPdfStatus", e)) setError("scanPdfStatus", "Could not make a PDF from this photo."); }
});
