/* AK Premium v12 — pdf-to-ppt (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Converters ---------- */

const pdfPptBtn = $("pdfPptBtn");
if (pdfPptBtn) pdfPptBtn.addEventListener("click", async () => {
  const file = ($("pdfPptInput").files || [])[0];
  if (!file) { setError("pdfPptStatus", "Please select a PDF file first."); return; }
  if (!needLibrary(!!window.PptxGenJS, "PptxGenJS", "pdfPptStatus")) return;
  try {
    const pages = await extractPdfLines(file, "pdfPptStatus");
    if (pages === null) return;
    if (!pages.some((pg) => pg.lines.length)) { setError("pdfPptStatus", "No readable text was found in this PDF. It may be a scanned PDF — try OCR PDF first."); return; }
    const pptx = new window.PptxGenJS();
    pages.forEach((pg) => {
      const slide = pptx.addSlide();
      const title = pg.lines.length ? pg.lines[0].text : "Page " + pg.page;
      const body = pg.lines.slice(1).map((l) => l.text).join("\n");
      slide.addText(title, { x: 0.5, y: 0.3, w: 9, fontSize: 20, bold: true });
      slide.addText(body || "(no text on this page)", { x: 0.5, y: 1.0, w: 9, h: 4.5, fontSize: 12 });
    });
    await pptx.writeFile({ fileName: "ak-premium-pdf-to-ppt.pptx" });
    setStatus("pdfPptStatus", "Done. Presentation file downloaded.");
  } catch (e) { if (!setPdfError("pdfPptStatus", e)) setError("pdfPptStatus", "Could not convert this PDF to PPT."); }
});

/* Shared engine: plain text (or simple HTML with tags stripped) to a
   paginated 12-point PDF. Used by TXT / HTML to PDF and by the HTML to
   PDF landing page. Takes no element ids, so it splits to core.js. */
