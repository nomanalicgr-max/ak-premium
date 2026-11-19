/* AK Premium v12 — resize-pdf-page-size (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: PDF matrix (batch 1) ---------- */

const resizePageBtn = $("resizePageBtn");
if (resizePageBtn) resizePageBtn.addEventListener("click", async () => {
  const file = ($("resizePageInput").files || [])[0];
  if (!file) { setError("resizePageStatus", "Please select a PDF file first."); return; }
  if (!checkFileSize(file, "resizePageStatus")) return;
  const size = $("pageSizeSelect").value || "A4";
  const sizes = { A4: [595.28, 841.89], Letter: [612, 792], Legal: [612, 1008] };
  const target = sizes[size] || sizes.A4;
  setStatus("resizePageStatus", "Resizing pages to " + size + "…");
  try {
    const doc = await loadPdfLibDoc(file, "resizePageStatus");
    if (!doc) return;
    const out = await window.PDFLib.PDFDocument.create();
    const count = doc.getPageCount();
    for (let i = 0; i < count; i++) {
      const srcPage = doc.getPage(i);
      const [embedded] = await out.embedPdf(doc, [i]);
      const srcSize = srcPage.getSize();
      const scale = Math.min(target[0] / srcSize.width, target[1] / srcSize.height);
      const w = srcSize.width * scale, h = srcSize.height * scale;
      const page = out.addPage([target[0], target[1]]);
      page.drawPage(embedded, { x: (target[0] - w) / 2, y: (target[1] - h) / 2, xScale: scale, yScale: scale });
    }
    const bytes = await out.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-resized.pdf");
    setStatus("resizePageStatus", "Done. All " + count + " page(s) resized to " + size + ".");
  } catch (e) { if (!setPdfError("resizePageStatus", e)) setError("resizePageStatus", "Could not resize this PDF. Please check the file."); }
});
