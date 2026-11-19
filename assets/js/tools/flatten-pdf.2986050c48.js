/* AK Premium v12 — flatten-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: PDF matrix (batch 1) ---------- */

const flattenBtn = $("flattenBtn");
if (flattenBtn) flattenBtn.addEventListener("click", async () => {
  const file = ($("flattenInput").files || [])[0];
  if (!file) { setError("flattenStatus", "Please select a PDF file first."); return; }
  if (!checkFileSize(file, "flattenStatus")) return;
  setStatus("flattenStatus", "Flattening PDF…");
  try {
    const doc = await loadPdfLibDoc(file, "flattenStatus");
    if (!doc) return;
    /* Only touch the form when the PDF already has one: calling
       getForm() on a form-less PDF would add an empty AcroForm. */
    if (doc.catalog.has(window.PDFLib.PDFName.of("AcroForm"))) {
      const form = doc.getForm();
      if (form.getFields().length) form.flatten();
    }
    doc.getPages().forEach((page) => {
      page.node.delete(window.PDFLib.PDFName.of("Annots"));
    });
    const bytes = await doc.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-flattened.pdf");
    setStatus("flattenStatus", "Done. PDF flattened.");
  } catch (e) { if (!setPdfError("flattenStatus", e)) setError("flattenStatus", "Could not flatten this PDF. Please check the file."); }
});

/* PDF Metadata Editor: show the current metadata when a file is chosen. */
