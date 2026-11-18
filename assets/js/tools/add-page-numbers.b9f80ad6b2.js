/* AK Premium v12 — add-page-numbers (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- PDF Studio ---------- */

const pageNumbersBtn = $("pageNumbersBtn");
if (pageNumbersBtn) pageNumbersBtn.addEventListener("click", async () => {
  const file = ($("numbersInput").files || [])[0];
  if (!file) { setError("pageNumbersStatus", "Please select a PDF file first."); return; }
  try {
    const doc = await loadPdfLibDoc(file, "pageNumbersStatus");
    if (!doc) return;
    const font = await doc.embedFont(window.PDFLib.StandardFonts.Helvetica);
    doc.getPages().forEach((page, i) => {
      const { width, height } = page.getSize();
      page.drawText(String(i + 1), { x: width / 2 - 5, y: 20, size: 11, font, color: window.PDFLib.rgb(0.2, 0.2, 0.2) });
    });
    const bytes = await doc.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-numbered.pdf");
    setStatus("pageNumbersStatus", "Done. Numbered PDF downloaded.");
  } catch (e) { if (!setPdfError("pageNumbersStatus", e)) setError("pageNumbersStatus", "Could not add page numbers to this PDF."); }
});

/* Honest size wording for Compress: a tiny text PDF re-rendered as images
   can come out larger, and "0% smaller" would hide that. */
