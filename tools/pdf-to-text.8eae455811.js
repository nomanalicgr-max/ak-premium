/* AK Premium v12 — pdf-to-text (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- New PDF tools: Remove Pages + Add Watermark ---------- */

const pdfTextBtn = $("pdfTextBtn");
if (pdfTextBtn) pdfTextBtn.addEventListener("click", async () => {
  const file = ($("pdfTextInput").files || [])[0];
  if (!file) { setError("pdfTextStatus", "Please select a PDF file first."); return; }
  const format = ($("pdfTextFormat") || {}).value || "txt";
  try {
    if (format === "csv") {
      const pages = await extractPdfTableItems(file, "pdfTextStatus");
      if (pages === null) return;
      const tables = detectPdfTables(pages);
      if (!tables.length) { setError("pdfTextStatus", "No tables were found in this PDF — the text has no clear rows and columns. Try the plain text format instead."); return; }
      const csv = tables.map((tb, n) => {
        const rows = tb.rows.map((row) => row.map((c) => csvCell(c ? c.text : "")).join(","));
        return ["Table " + (n + 1) + " (page " + tb.page + ")"].concat(rows).join("\n");
      }).join("\n\n");
      downloadText(csv, "ak-premium-tables.csv", "text/csv;charset=utf-8");
      setStatus("pdfTextStatus", "Done. " + tables.length + " table" + (tables.length > 1 ? "s" : "") + " downloaded as CSV — one table per block, with a header line naming the page.");
      return;
    }
    if (format === "md") {
      const layout = await extractPdfLayout(file, "pdfTextStatus");
      if (layout === null) return;
      const out = [];
      let anyText = false;
      for (const pg of layout) {
        out.push("--- Page " + pg.page + (pg.columns === 2 ? " (two columns, left first)" : "") + " ---");
        pg.lines.forEach((l) => { anyText = true; out.push(l.heading ? "# " + l.text : l.text); });
      }
      if (!anyText) { setError("pdfTextStatus", "No readable text was found in this PDF. It may be a scanned PDF — use OCR PDF first to read the pages."); return; }
      downloadText(out.join("\n"), "ak-premium-text.md", "text/markdown;charset=utf-8");
      setStatus("pdfTextStatus", "Done. Markdown file downloaded — headings are marked with # and two-column pages read left column first.");
      return;
    }
    const text = await extractPdfText(file, "pdfTextStatus");
    if (text === null) return;
    downloadText(text, "ak-premium-text.txt");
    setStatus("pdfTextStatus", "Done. Text file downloaded.");
  } catch (e) { if (!setPdfError("pdfTextStatus", e)) setError("pdfTextStatus", "Could not extract text from this PDF. Scanned-image PDFs without a text layer cannot be read this way."); }
});

/* Shared engine: render PDF pages to images (one image per page, at
   1.5x scale, with a per-page link and one ZIP file). Used by PDF to
   Images and by the PDF to JPG and PDF to PNG landing pages. Takes no
   element ids, so it splits to core.js. */
