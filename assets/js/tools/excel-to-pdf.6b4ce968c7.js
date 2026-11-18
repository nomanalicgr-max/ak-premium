/* AK Premium v12 — excel-to-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Converters ---------- */

const excelPdfBtn = $("excelPdfBtn");
if (excelPdfBtn) excelPdfBtn.addEventListener("click", async () => {
  const file = ($("excelPdfInput").files || [])[0];
  if (!file) { setError("excelPdfStatus", "Please select an Excel file first."); return; }
  const JsPDF = getJsPdf();
  if (!needLibrary(!!JsPDF, "jsPDF", "excelPdfStatus") || !needLibrary(!!window.XLSX, "SheetJS", "excelPdfStatus")) return;
  try {
    const data = await readAsArrayBuffer(file);
    const wb = window.XLSX.read(data, { type: "array" });
    if (!wb.SheetNames || !wb.SheetNames.length) { setError("excelPdfStatus", "No sheets were found in this Excel file."); return; }
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (!rows.length) { setError("excelPdfStatus", "The first sheet is empty. Nothing to convert."); return; }
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
  } catch (e) { setError("excelPdfStatus", "Could not convert this Excel file to PDF."); }
});
