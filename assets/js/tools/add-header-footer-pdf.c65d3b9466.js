/* AK Premium v12 — add-header-footer-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: PDF matrix (batch 1) ---------- */

const headerFooterBtn = $("headerFooterBtn");
if (headerFooterBtn) headerFooterBtn.addEventListener("click", async () => {
  const file = ($("headerFooterInput").files || [])[0];
  if (!file) { setError("headerFooterStatus", "Please select a PDF file first."); return; }
  if (!checkFileSize(file, "headerFooterStatus")) return;
  const header = ($("headerText").value || "").trim();
  const footer = ($("footerText").value || "").trim();
  if (!header && !footer) { setError("headerFooterStatus", "Please type a header or a footer first."); return; }
  setStatus("headerFooterStatus", "Adding header and footer…");
  try {
    const doc = await loadPdfLibDoc(file, "headerFooterStatus");
    if (!doc) return;
    const font = await doc.embedFont(window.PDFLib.StandardFonts.Helvetica);
    const grey = window.PDFLib.rgb(0.35, 0.35, 0.35);
    doc.getPages().forEach((page) => {
      const { width, height } = page.getSize();
      const maxW = width - 72;
      if (header) {
        let size = 10;
        while (size > 7 && font.widthOfTextAtSize(header, size) > maxW) size -= 1;
        page.drawText(header, { x: 36, y: height - 30, size, font, color: grey });
      }
      if (footer) {
        let size = 10;
        while (size > 7 && font.widthOfTextAtSize(footer, size) > maxW) size -= 1;
        page.drawText(footer, { x: 36, y: 20, size, font, color: grey });
      }
    });
    const bytes = await doc.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-header-footer.pdf");
    setStatus("headerFooterStatus", "Done. Header and footer added to every page.");
  } catch (e) { if (!setPdfError("headerFooterStatus", e)) setError("headerFooterStatus", "Could not add a header or footer to this PDF. Please check the file."); }
});
