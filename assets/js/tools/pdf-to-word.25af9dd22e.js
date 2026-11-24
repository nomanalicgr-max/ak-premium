/* AK Premium v12 — pdf-to-word (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Converters ---------- */

function pdfWordLineRuns(line, medH) {
  const maxH = Math.max.apply(null, line.items.map((it) => it.h));
  let level = 0;
  if (line.text.length <= 100 && maxH >= medH * 1.8) level = 1;
  else if (line.text.length <= 120 && maxH >= medH * 1.4) level = 2;
  else if (line.text.length <= 120 && maxH >= medH * 1.25) level = 3;
  const runs = [];
  line.items.forEach((it) => {
    const bold = /bold/i.test(it.font || "");
    const italic = /italic|oblique/i.test(it.font || "");
    const last = runs[runs.length - 1];
    if (last && last.bold === bold && last.italic === italic) last.text += " " + it.str;
    else runs.push({ text: it.str, bold, italic });
  });
  return { level, runs };
}
/* One grid-detected table (from detectPdfTables) → a real docx Table with
   a bold header row; merged cells use columnSpan and the covered cells
   are skipped so the row keeps the right column count. */

function docxTableFromGrid(grid, merges) {
  const rows = grid.map((row, ri) => {
    const cells = [];
    let skipUntil = -1;
    row.forEach((cell, ci) => {
      if (ci <= skipUntil) return;
      if (!cell) { cells.push(new window.docx.TableCell({ children: [new window.docx.Paragraph({ text: "" })] })); return; }
      const span = cell.span || 1;
      if (span > 1) skipUntil = ci + span - 1;
      const opts = { children: [new window.docx.Paragraph({ children: [new window.docx.TextRun({ text: cell.text || "", bold: ri === 0 })] })] };
      if (span > 1) opts.columnSpan = span;
      cells.push(new window.docx.TableCell(opts));
    });
    return new window.docx.TableRow({ tableHeader: ri === 0, children: cells });
  });
  return new window.docx.Table({ width: { size: 100, type: window.docx.WidthType.PERCENTAGE }, rows });
}

const pdfWordBtn = $("pdfWordBtn");
if (pdfWordBtn) pdfWordBtn.addEventListener("click", async () => {
  const file = ($("pdfWordInput").files || [])[0];
  if (!file) { setError("pdfWordStatus", "Please select a PDF file first."); return; }
  if (!needLibrary(!!window.docx, "docx", "pdfWordStatus")) return;
  try {
    const layout = await extractPdfLayout(file, "pdfWordStatus");
    if (layout === null) return;
    let children = [];
    let headingCount = 0, tableCount = 0, imageCount = 0;
    if (layout.some((pg) => pg.lines.length)) {
      const tablePages = await extractPdfTableItems(file, "pdfWordStatus");
      const tables = tablePages ? detectPdfTables(tablePages) : [];
      const images = await extractPdfImages(file, "pdfWordStatus");
      for (const pg of layout) {
        const medH = median.apply(null, pg.lines.map((l) => Math.max.apply(null, l.items.map((i) => i.h))));
        const pgTables = tables.filter((t) => t.page === pg.page);
        const emitted = new Set();
        const pgImages = (images || []).filter((im) => im.page === pg.page && im.place)
          .sort((a, b) => (b.place.y + b.place.h) - (a.place.y + a.place.h));
        const pgUnplaced = (images || []).filter((im) => im.page === pg.page && !im.place);
        let imgIdx = 0;
        const emitImage = async (im) => {
          const data = await im.blob.arrayBuffer();
          const dims = await imageBlobDimensions(im.blob);
          let w = 600, h = 450;
          if (dims) { const s = Math.min(1, 600 / dims.width); w = Math.round(dims.width * s); h = Math.round(dims.height * s); }
          children.push(new window.docx.Paragraph({ children: [new window.docx.ImageRun({ data, transformation: { width: w, height: h } })] }));
          imageCount++;
        };
        for (const line of pg.lines) {
          // images sitting at or above this line come first, top to bottom
          while (imgIdx < pgImages.length && (pgImages[imgIdx].place.y + pgImages[imgIdx].place.h) >= line.y) await emitImage(pgImages[imgIdx++]);
          const tbIdx = pgTables.findIndex((t, i) => !emitted.has(i) && t.rowYs.some((ry) => Math.abs(ry - line.y) < 3));
          if (tbIdx !== -1) {
            emitted.add(tbIdx);
            children.push(docxTableFromGrid(pgTables[tbIdx].rows, pgTables[tbIdx].merges));
            tableCount++;
            continue;
          }
          if (pgTables.some((t) => t.rowYs.some((ry) => Math.abs(ry - line.y) < 3))) continue; // covered by an emitted table
          const parsed = pdfWordLineRuns(line, medH);
          if (parsed.level) headingCount++;
          const heading = parsed.level === 1 ? window.docx.HeadingLevel.HEADING_1 : parsed.level === 2 ? window.docx.HeadingLevel.HEADING_2 : parsed.level === 3 ? window.docx.HeadingLevel.HEADING_3 : undefined;
          children.push(new window.docx.Paragraph({
            heading,
            children: parsed.runs.map((r) => new window.docx.TextRun({ text: r.text, bold: r.bold, italics: r.italic }))
          }));
        }
        while (imgIdx < pgImages.length) await emitImage(pgImages[imgIdx++]);
        for (const im of pgUnplaced) await emitImage(im); // no position found: keep it, at the end of the page
        if (pg.page < layout.length) children.push(new window.docx.Paragraph({ children: [new window.docx.PageBreak()] }));
      }
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
    setStatus("pdfWordStatus", "Done. Word file downloaded (" + headingCount + " heading(s), " + tableCount + " table(s), " + imageCount + " image(s)). Open it in Word or Google Docs to check the layout.");
  } catch (e) { if (!setPdfError("pdfWordStatus", e)) setError("pdfWordStatus", "Could not convert this PDF to Word. Complex original formatting is not preserved by this simple conversion."); }
});
