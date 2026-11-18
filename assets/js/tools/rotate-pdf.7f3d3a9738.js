/* AK Premium v12 — rotate-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- PDF Studio ---------- */

const rotatePdfBtn = $("rotatePdfBtn");
if (rotatePdfBtn) rotatePdfBtn.addEventListener("click", async () => {
  const file = ($("rotateInput").files || [])[0];
  if (!file) { setError("rotatePdfStatus", "Please select a PDF file first."); return; }
  const angle = parseInt($("rotateAngle").value, 10);
  try {
    const doc = await loadPdfLibDoc(file, "rotatePdfStatus");
    if (!doc) return;
    // Add to the page's existing rotation instead of replacing it, so a
    // page already rotated 90 degrees becomes 180, not 90 again.
    doc.getPages().forEach((page) => {
      const current = page.getRotation().angle || 0;
      page.setRotation(window.PDFLib.degrees((current + angle) % 360));
    });
    const bytes = await doc.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-rotated.pdf");
    setStatus("rotatePdfStatus", "Done. Rotated PDF downloaded.");
  } catch (e) { if (!setPdfError("rotatePdfStatus", e)) setError("rotatePdfStatus", "Could not rotate this PDF. Please check the file."); }
});
