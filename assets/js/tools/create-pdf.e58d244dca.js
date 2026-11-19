/* AK Premium v12 — create-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- PDF Studio ---------- */

const createPdfBtn = $("createPdfBtn");
if (createPdfBtn) createPdfBtn.addEventListener("click", () => {
  const JsPDF = getJsPdf();
  if (!needLibrary(!!JsPDF, "jsPDF", "createPdfStatus")) return;
  const text = $("createText").value.trim();
  if (!text) { setError("createPdfStatus", "Please type some text first."); return; }
  const doc = new JsPDF();
  doc.setFontSize(12);
  addWrappedTextPaginated(doc, text);
  doc.save("ak-premium-created.pdf");
  setStatus("createPdfStatus", "Done. PDF downloaded.");
});

/* Shared engine: images to PDF (one image per A4 page, fitted with a
   small margin). Used by Images to PDF and by the JPG to PDF and PNG to
   PDF landing pages. Takes no element ids, so it splits to core.js. */
