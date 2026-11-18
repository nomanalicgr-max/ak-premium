/* AK Premium v12 — csv-to-excel (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- New spreadsheet tools: Excel to CSV + CSV to Excel ---------- */

const csvExcelBtn = $("csvExcelBtn");
if (csvExcelBtn) csvExcelBtn.addEventListener("click", async () => {
  if (!needLibrary(!!window.XLSX, "SheetJS", "csvExcelStatus")) return;
  let csvText = "";
  const file = ($("csvExcelInput").files || [])[0];
  try {
    if (file) csvText = await file.text();
    else csvText = ($("csvExcelText").value || "").trim();
    if (!csvText) { setError("csvExcelStatus", "Please upload a .csv file or paste CSV text first."); return; }
    let wb = null;
    try { wb = window.XLSX.read(csvText, { type: "string" }); } catch (e) { wb = null; }
    if (!wb || !wb.SheetNames || !wb.SheetNames.length || !wb.Sheets[wb.SheetNames[0]] || !Object.keys(wb.Sheets[wb.SheetNames[0]]).length) {
      // Fallback: simple line/comma split for plain CSV without quoted commas.
      const rows = csvText.split(/\r?\n/).filter((l) => l.trim()).map((l) => l.split(","));
      const ws = window.XLSX.utils.aoa_to_sheet(rows);
      wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    }
    window.XLSX.writeFile(wb, "ak-premium-csv-to-excel.xlsx");
    setStatus("csvExcelStatus", "Done. Excel file downloaded.");
  } catch (e) { setError("csvExcelStatus", "Could not convert this CSV to Excel."); }
});
