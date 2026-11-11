/* AK Premium v9 — bundle-convert (split from app.js, Phase 4.3). Loads after core.js. */

/* ---------- Converters ---------- */

const pdfExcelBtn = $("pdfExcelBtn");
if (pdfExcelBtn) pdfExcelBtn.addEventListener("click", async () => {
  const file = ($("pdfExcelInput").files || [])[0];
  if (!file) { setStatus("pdfExcelStatus", "Please select a PDF file first."); return; }
  if (!needLibrary(!!window.XLSX, "SheetJS", "pdfExcelStatus")) return;
  try {
    const pages = await extractPdfLines(file, "pdfExcelStatus");
    if (pages === null) return;
    const rows = [];
    for (const pg of pages) for (const line of pg.lines) {
      const cols = splitLineIntoColumns(line);
      rows.push(cols.length > 1 ? cols : [line.text]);
    }
    if (!rows.length) { setStatus("pdfExcelStatus", "No readable text was found in this PDF. It may be a scanned PDF — try OCR PDF first, then convert the text PDF."); return; }
    const ws = window.XLSX.utils.aoa_to_sheet([["AK Premium - extracted PDF text"], ...rows]);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Extracted Text");
    window.XLSX.writeFile(wb, "ak-premium-pdf-to-excel.xlsx");
    setStatus("pdfExcelStatus", "Done. Excel file downloaded.");
  } catch (e) { if (!setPdfError("pdfExcelStatus", e)) setStatus("pdfExcelStatus", "Could not convert this PDF to Excel."); }
});

const pdfWordBtn = $("pdfWordBtn");
if (pdfWordBtn) pdfWordBtn.addEventListener("click", async () => {
  const file = ($("pdfWordInput").files || [])[0];
  if (!file) { setStatus("pdfWordStatus", "Please select a PDF file first."); return; }
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
      setStatus("pdfWordStatus", "No text layer found. Running OCR on the scanned pages, this takes a while...");
      const ocrText = await ocrPdfPages(file, "eng", "pdfWordStatus");
      if (ocrText) children = ocrText.split("\n").map((line) => new window.docx.Paragraph({ text: line }));
    }
    if (!children.length) { setStatus("pdfWordStatus", "No readable text was found in this PDF. It may be a scanned PDF — tick the OCR option and try again."); return; }
    // docx v8 Paragraph takes an options object, not a bare string.
    const doc = new window.docx.Document({ sections: [{ children }] });
    const blob = await window.docx.Packer.toBlob(doc);
    downloadBlob(blob, "ak-premium-pdf-to-word.docx");
    setStatus("pdfWordStatus", "Done. Word file downloaded.");
  } catch (e) { if (!setPdfError("pdfWordStatus", e)) setStatus("pdfWordStatus", "Could not convert this PDF to Word. Complex original formatting is not preserved by this simple conversion."); }
});

const pdfPptBtn = $("pdfPptBtn");
if (pdfPptBtn) pdfPptBtn.addEventListener("click", async () => {
  const file = ($("pdfPptInput").files || [])[0];
  if (!file) { setStatus("pdfPptStatus", "Please select a PDF file first."); return; }
  if (!needLibrary(!!window.PptxGenJS, "PptxGenJS", "pdfPptStatus")) return;
  try {
    const pages = await extractPdfLines(file, "pdfPptStatus");
    if (pages === null) return;
    if (!pages.some((pg) => pg.lines.length)) { setStatus("pdfPptStatus", "No readable text was found in this PDF. It may be a scanned PDF — try OCR PDF first."); return; }
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
  } catch (e) { if (!setPdfError("pdfPptStatus", e)) setStatus("pdfPptStatus", "Could not convert this PDF to PPT."); }
});

const txtHtmlPdfBtn = $("txtHtmlPdfBtn");
if (txtHtmlPdfBtn) txtHtmlPdfBtn.addEventListener("click", () => {
  const JsPDF = getJsPdf();
  if (!needLibrary(!!JsPDF, "jsPDF", "txtHtmlPdfStatus")) return;
  const raw = $("txtHtmlInput").value.trim();
  if (!raw) { setStatus("txtHtmlPdfStatus", "Please paste some text or simple HTML first."); return; }
  const clean = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const doc = new JsPDF();
  doc.setFontSize(12);
  addWrappedTextPaginated(doc, clean);
  doc.save("ak-premium-text-to-pdf.pdf");
  setStatus("txtHtmlPdfStatus", "Done. PDF downloaded.");
});

const excelPdfBtn = $("excelPdfBtn");
if (excelPdfBtn) excelPdfBtn.addEventListener("click", async () => {
  const file = ($("excelPdfInput").files || [])[0];
  if (!file) { setStatus("excelPdfStatus", "Please select an Excel file first."); return; }
  const JsPDF = getJsPdf();
  if (!needLibrary(!!JsPDF, "jsPDF", "excelPdfStatus") || !needLibrary(!!window.XLSX, "SheetJS", "excelPdfStatus")) return;
  try {
    const data = await readAsArrayBuffer(file);
    const wb = window.XLSX.read(data, { type: "array" });
    if (!wb.SheetNames || !wb.SheetNames.length) { setStatus("excelPdfStatus", "No sheets were found in this Excel file."); return; }
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (!rows.length) { setStatus("excelPdfStatus", "The first sheet is empty. Nothing to convert."); return; }
    const doc = new JsPDF();
    let y = 20;
    doc.setFontSize(11);
    rows.forEach((row) => {
      const line = row.map((c) => String(c == null ? "" : c)).join("  |  ");
      wrapPdfText(doc, line, 170).forEach((part) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(part, 15, y); y += 7;
      });
    });
    doc.save("ak-premium-excel-to-pdf.pdf");
    setStatus("excelPdfStatus", "Done. PDF downloaded.");
  } catch (e) { setStatus("excelPdfStatus", "Could not convert this Excel file to PDF."); }
});

const wordPdfBtn = $("wordPdfBtn");
if (wordPdfBtn) wordPdfBtn.addEventListener("click", async () => {
  const file = ($("wordPdfInput").files || [])[0];
  if (!file) { setStatus("wordPdfStatus", "Please select a Word (.docx) file first."); return; }
  const JsPDF = getJsPdf();
  if (!needLibrary(!!JsPDF, "jsPDF", "wordPdfStatus") || !needLibrary(!!window.mammoth, "mammoth", "wordPdfStatus")) return;
  try {
    const data = await readAsArrayBuffer(file);
    const result = await window.mammoth.extractRawText({ arrayBuffer: data });
    if (!result.value || !result.value.trim()) { setStatus("wordPdfStatus", "No text was found in this Word file. Nothing to convert."); return; }
    const doc = new JsPDF();
    doc.setFontSize(12);
    let y = 20;
    result.value.split("\n").forEach((line) => {
      wrapPdfText(doc, line, 170).forEach((part) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(part, 15, y); y += 7;
      });
    });
    doc.save("ak-premium-word-to-pdf.pdf");
    setStatus("wordPdfStatus", "Done. PDF downloaded.");
  } catch (e) { setStatus("wordPdfStatus", "Could not convert this Word file to PDF."); }
});

const pptPdfBtn = $("pptPdfBtn");
if (pptPdfBtn) pptPdfBtn.addEventListener("click", async () => {
  const file = ($("pptPdfInput").files || [])[0];
  if (!file) { setStatus("pptPdfStatus", "Please select a PowerPoint (.pptx) file first."); return; }
  const JsPDF = getJsPdf();
  if (!needLibrary(!!JsPDF, "jsPDF", "pptPdfStatus") || !needLibrary(!!window.JSZip, "JSZip", "pptPdfStatus")) return;
  try {
    const data = await readAsArrayBuffer(file);
    const zip = await window.JSZip.loadAsync(data);
    const slideNames = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort();
    if (!slideNames.length) { setStatus("pptPdfStatus", "No slide text was found in this .pptx file. This basic conversion cannot read it."); return; }
    const doc = new JsPDF();
    let first = true;
    for (const name of slideNames) {
      const xml = await zip.files[name].async("string");
      const texts = Array.from(xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)).map((m) => m[1]).join(" ");
      if (!first) doc.addPage(); first = false;
      doc.setFontSize(12);
      doc.text(wrapPdfText(doc, texts || "(No text on this slide)", 170), 15, 20);
    }
    doc.save("ak-premium-ppt-to-pdf.pdf");
    setStatus("pptPdfStatus", "Done. PDF downloaded.");
  } catch (e) { setStatus("pptPdfStatus", "Could not convert this PowerPoint file to PDF. This is a basic, text-only conversion."); }
});
