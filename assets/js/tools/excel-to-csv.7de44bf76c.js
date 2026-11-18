/* AK Premium v12 — excel-to-csv (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- New spreadsheet tools: Excel to CSV + CSV to Excel ---------- */

const excelCsvBtn = $("excelCsvBtn");
if (excelCsvBtn) excelCsvBtn.addEventListener("click", async () => {
  const file = ($("excelCsvInput").files || [])[0];
  if (!file) { setError("excelCsvStatus", "Please select an Excel file first."); return; }
  if (!needLibrary(!!window.XLSX, "SheetJS", "excelCsvStatus")) return;
  try {
    const data = await readAsArrayBuffer(file);
    const wb = window.XLSX.read(data, { type: "array" });
    if (!wb.SheetNames || !wb.SheetNames.length) { setError("excelCsvStatus", "No sheets were found in this Excel file."); return; }
    const csv = window.XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
    if (!csv.trim()) { setError("excelCsvStatus", "The first sheet is empty. Nothing to export."); return; }
    downloadText(csv, "ak-premium-sheet.csv", "text/csv;charset=utf-8");
    setStatus("excelCsvStatus", "Done. CSV downloaded (first sheet).");
  } catch (e) { setError("excelCsvStatus", "Could not convert this Excel file to CSV."); }
});
