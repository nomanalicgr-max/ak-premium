/* AK Premium v12 — crop-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- New tools (all in browser) ---------- */

const cropPdfBtn = $("cropPdfBtn");
if (cropPdfBtn) cropPdfBtn.addEventListener("click", async () => {
  const file = ($("cropInput").files || [])[0]; if (!file) { setError("cropPdfStatus", "Please select a PDF file first."); return; }
  const m = parseFloat($("cropMargin").value) || 0;
  try {
    const doc = await loadPdfLibDoc(file, "cropPdfStatus"); if (!doc) return;
    doc.getPages().forEach((page) => {
      const { width, height } = page.getSize();
      page.setCropBox(m, m, Math.max(10, width - 2*m), Math.max(10, height - 2*m));
    });
    const bytes = await doc.save(); downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-cropped.pdf");
    setStatus("cropPdfStatus", "Done. Cropped PDF downloaded.");
  } catch (e) { if (!setPdfError("cropPdfStatus", e)) setError("cropPdfStatus", "Could not crop this PDF."); }
});
