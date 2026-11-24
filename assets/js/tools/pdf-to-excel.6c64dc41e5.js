/* AK Premium v12 — pdf-to-excel (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Converters ---------- */

const pdfExcelBtn = $("pdfExcelBtn");
if (pdfExcelBtn) pdfExcelBtn.addEventListener("click", async () => {
  const file = ($("pdfExcelInput").files || [])[0];
  if (!file) { setError("pdfExcelStatus", "Please select a PDF file first."); return; }
  if (!needLibrary(!!window.XLSX, "SheetJS", "pdfExcelStatus")) return;
  const useOcr = !!($("pdfExcelOcr") && $("pdfExcelOcr").checked);
  const picker = $("pdfExcelTables");
  const dlBtn = $("pdfExcelDownloadBtn");
  if (dlBtn) dlBtn.disabled = true;
  if (picker) picker.innerHTML = "";
  pdfExcelDetected = null;
  try {
    setStatus("pdfExcelStatus", useOcr ? "Reading the scan with OCR, this may take a moment..." : "Reading the PDF...");
    const pages = useOcr
      ? await ocrPdfWords(file, "pdfExcelStatus")
      : await extractPdfTableItems(file, "pdfExcelStatus");
    if (pages === null) return;
    if (!pages.some((p) => p.items.length)) {
      setError("pdfExcelStatus", useOcr ? "OCR found no readable text in this PDF. Try a clearer scan." : "No readable text was found in this PDF. It may be a scanned PDF — tick the OCR option and try again.");
      return;
    }
    const tables = detectPdfTables(pages);
    if (!tables.length) {
      setError("pdfExcelStatus", "No tables were found — the text has no clear rows and columns. " + (useOcr ? "Try a clearer scan." : "If this is a scan, tick the OCR option and try again."));
      return;
    }
    pdfExcelDetected = tables;
    if (picker) {
      picker.innerHTML = tables.map((tb, i) => {
        const head = tb.rows[0].map((c) => c ? c.text : "").filter(Boolean).slice(0, 3).join(" | ");
        return '<label><input type="checkbox" data-pdfexcel-table="' + i + '" checked> Table ' + (i + 1) + " — page " + tb.page + ", " + tb.rows.length + " rows × " + tb.cols + " columns" + (head ? " — " + escapeHtml(head) : "") + "</label>";
      }).join("");
    }
    if (dlBtn) dlBtn.disabled = false;
    setStatus("pdfExcelStatus", "Found " + tables.length + " table" + (tables.length > 1 ? "s" : "") + ". Tick the ones you want, then press Download Excel. Each table goes on its own sheet.");
  } catch (e) { if (!setPdfError("pdfExcelStatus", e)) setError("pdfExcelStatus", "Could not convert this PDF to Excel."); }
});

const pdfExcelDownloadBtn = $("pdfExcelDownloadBtn");
if (pdfExcelDownloadBtn) pdfExcelDownloadBtn.addEventListener("click", () => {
  if (!pdfExcelDetected || !pdfExcelDetected.length) { setError("pdfExcelStatus", "Find the tables first, then download."); return; }
  if (!needLibrary(!!window.XLSX, "SheetJS", "pdfExcelStatus")) return;
  try {
    const picked = Array.from(document.querySelectorAll('[data-pdfexcel-table]:checked')).map((c) => parseInt(c.getAttribute("data-pdfexcel-table"), 10));
    const chosen = picked.length ? picked.map((i) => pdfExcelDetected[i]).filter(Boolean) : pdfExcelDetected;
    const wb = window.XLSX.utils.book_new();
    chosen.forEach((tb, n) => {
      const aoa = tb.rows.map((row) => {
        const out = [];
        /* Empty cells keep their column: a blank cell is pushed as an empty
           string, never skipped, so a Total row with empty Qty and Price
           still puts its total in the Total column. */
        row.forEach((c) => { out.push(c ? excelCellValue(c.text) : ""); });
        return out;
      });
      const ws = window.XLSX.utils.aoa_to_sheet(aoa);
      ws["!merges"] = tb.merges.map((mg) => ({ s: { r: mg.row, c: mg.col }, e: { r: mg.row, c: mg.col + mg.span - 1 } }));
      window.XLSX.utils.book_append_sheet(wb, ws, "Table " + (n + 1));
    });
    window.XLSX.writeFile(wb, "ak-premium-pdf-to-excel.xlsx");
    setStatus("pdfExcelStatus", "Done. " + chosen.length + " table" + (chosen.length > 1 ? "s" : "") + " downloaded as ak-premium-pdf-to-excel.xlsx, one sheet per table. Numbers and dates are real Excel values — check a few cells before trusting a total.");
  } catch (e) { setError("pdfExcelStatus", "Could not build the Excel file."); }
});

/* Median of a list of numbers (0 for an empty list). */
