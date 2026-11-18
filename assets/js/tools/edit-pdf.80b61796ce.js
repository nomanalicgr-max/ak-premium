/* AK Premium v12 — edit-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 1 handlers: PDF ---------- */

const editPdfBtn = $("editPdfBtn");
if (editPdfBtn) editPdfBtn.addEventListener("click", async () => {
  const file = ($("editPdfInput").files || [])[0];
  if (!file) { setError("editPdfStatus", "Please select a PDF file first."); return; }
  const text = ($("editPdfText").value || "").trim();
  if (!text) { setError("editPdfStatus", "Please enter text to add first."); return; }
  const pageNum = parseInt($("editPdfPage").value, 10);
  const size = parseInt($("editPdfSize").value, 10) || 18;
  const position = $("editPdfPosition").value;
  try {
    const doc = await loadPdfLibDoc(file, "editPdfStatus");
    if (!doc) return;
    const count = doc.getPageCount();
    if (!pageNum || pageNum < 1 || pageNum > count) { setError("editPdfStatus", "This PDF has " + count + " page(s). Please choose a page inside 1 to " + count + "."); return; }
    const font = await doc.embedFont(window.PDFLib.StandardFonts.Helvetica);
    const page = doc.getPage(pageNum - 1);
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, size);
    let x = 40, y = height - 40;
    if (position === "top-centre") { x = Math.max(20, (width - textWidth) / 2); y = height - 40; }
    else if (position === "bottom-centre") { x = Math.max(20, (width - textWidth) / 2); y = 40; }
    else if (position === "centre") { x = Math.max(20, (width - textWidth) / 2); y = height / 2; }
    page.drawText(text, { x, y, size, font, color: window.PDFLib.rgb(0.11, 0.11, 0.11) });
    const bytes = await doc.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-edited.pdf");
    setStatus("editPdfStatus", "Done. Edited PDF downloaded.");
  } catch (e) { setError("editPdfStatus", "Could not edit this PDF. Please check the file."); }
});
