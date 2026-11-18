/* AK Premium v12 — pdf-to-word (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Converters ---------- */

const pdfWordBtn = $("pdfWordBtn");
if (pdfWordBtn) pdfWordBtn.addEventListener("click", async () => {
  const file = ($("pdfWordInput").files || [])[0];
  if (!file) { setError("pdfWordStatus", "Please select a PDF file first."); return; }
  if (!needLibrary(!!window.docx, "docx", "pdfWordStatus")) return;
  try {
    let pages = await extractPdfLines(file, "pdfWordStatus");
    if (pages === null) return;
    let children = [];
    for (const pg of pages) {
      pg.lines.forEach((line, idx) => {
        const isHeading = idx === 0 && line.text.length < 80 && !/[.!?]$/.test(line.text);
        children.push(isHeading ? new window.docx.Paragraph({ heading: window.docx.HeadingLevel.HEADING_2, children: [new window.docx.TextRun({ text: line.text, bold: true })] }) : new window.docx.Paragraph({ text: line.text }));
      });
    }
    if (!children.length && $("pdfWordOcr") && $("pdfWordOcr").checked) {
      setError("pdfWordStatus", "No text layer found. Running OCR on the scanned pages, this takes a while...");
      const ocrText = await ocrPdfPages(file, "eng", "pdfWordStatus");
      if (ocrText) children = ocrText.split("\n").map((line) => new window.docx.Paragraph({ text: line }));
    }
    if (!children.length) { setError("pdfWordStatus", "No readable text was found in this PDF. It may be a scanned PDF — tick the OCR option and try again."); return; }
    // docx v8 Paragraph takes an options object, not a bare string.
    const doc = new window.docx.Document({ sections: [{ children }] });
    const blob = await window.docx.Packer.toBlob(doc);
    downloadBlob(blob, "ak-premium-pdf-to-word.docx");
    setStatus("pdfWordStatus", "Done. Word file downloaded.");
  } catch (e) { if (!setPdfError("pdfWordStatus", e)) setError("pdfWordStatus", "Could not convert this PDF to Word. Complex original formatting is not preserved by this simple conversion."); }
});
