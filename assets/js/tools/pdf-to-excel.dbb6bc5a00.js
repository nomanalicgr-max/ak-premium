/* AK Premium v12 — pdf-to-excel (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Converters ---------- */

const pdfExcelBtn = $("pdfExcelBtn");
if (pdfExcelBtn) pdfExcelBtn.addEventListener("click", async () => {
  const file = ($("pdfExcelInput").files || [])[0];
  if (!file) { setError("pdfExcelStatus", "Please select a PDF file first."); return; }
  if (!needLibrary(!!window.XLSX, "SheetJS", "pdfExcelStatus")) return;
  try {
    const pages = await extractPdfLines(file, "pdfExcelStatus");
    if (pages === null) return;
    const rows = [];
    for (const pg of pages) for (const line of pg.lines) {
      const cols = splitLineIntoColumns(line);
      rows.push(cols.length > 1 ? cols : [line.text]);
    }
    if (!rows.length) { setError("pdfExcelStatus", "No readable text was found in this PDF. It may be a scanned PDF — try OCR PDF first, then convert the text PDF."); return; }
    const ws = window.XLSX.utils.aoa_to_sheet([["AK Premium - extracted PDF text"], ...rows]);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Extracted Text");
    window.XLSX.writeFile(wb, "ak-premium-pdf-to-excel.xlsx");
    setStatus("pdfExcelStatus", "Done. Excel file downloaded.");
  } catch (e) { if (!setPdfError("pdfExcelStatus", e)) setError("pdfExcelStatus", "Could not convert this PDF to Excel."); }
});
