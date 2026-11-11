/* AK Premium v9 — bundle-excel (split from app.js, Phase 4.3). Loads after core.js. */

/* ---------- New spreadsheet tools: Excel to CSV + CSV to Excel ---------- */

const excelCsvBtn = $("excelCsvBtn");
if (excelCsvBtn) excelCsvBtn.addEventListener("click", async () => {
  const file = ($("excelCsvInput").files || [])[0];
  if (!file) { setStatus("excelCsvStatus", "Please select an Excel file first."); return; }
  if (!needLibrary(!!window.XLSX, "SheetJS", "excelCsvStatus")) return;
  try {
    const data = await readAsArrayBuffer(file);
    const wb = window.XLSX.read(data, { type: "array" });
    if (!wb.SheetNames || !wb.SheetNames.length) { setStatus("excelCsvStatus", "No sheets were found in this Excel file."); return; }
    const csv = window.XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
    if (!csv.trim()) { setStatus("excelCsvStatus", "The first sheet is empty. Nothing to export."); return; }
    downloadText(csv, "ak-premium-sheet.csv", "text/csv;charset=utf-8");
    setStatus("excelCsvStatus", "Done. CSV downloaded (first sheet).");
  } catch (e) { setStatus("excelCsvStatus", "Could not convert this Excel file to CSV."); }
});

const csvExcelBtn = $("csvExcelBtn");
if (csvExcelBtn) csvExcelBtn.addEventListener("click", async () => {
  if (!needLibrary(!!window.XLSX, "SheetJS", "csvExcelStatus")) return;
  let csvText = "";
  const file = ($("csvExcelInput").files || [])[0];
  try {
    if (file) csvText = await file.text();
    else csvText = ($("csvExcelText").value || "").trim();
    if (!csvText) { setStatus("csvExcelStatus", "Please upload a .csv file or paste CSV text first."); return; }
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
  } catch (e) { setStatus("csvExcelStatus", "Could not convert this CSV to Excel."); }
});

/* ---------- Excel Automation Engine ---------- */

function runExcelEngine() {
  const input = $("excelInput").value.trim();
  const output = $("excelOutput");
  const status = $("excelStatus");
  if (!input) { if (status) status.textContent = "Please describe your task or paste a formula first."; return; }
  let result = "";
  if (excelModule === "generator") result = generateFormula(input);
  else if (excelModule === "explainer") result = explainFormula(input);
  else if (excelModule === "vba") result = generateVba(input);
  else if (excelModule === "regex") result = regexTool(input);
  else if (excelModule === "dax") result = generateDax(input);
  if (output) output.textContent = result;
  if (status) status.textContent = "Done. Replace placeholders before use.";
}

const excelGenerateBtn = $("excelGenerateBtn");
if (excelGenerateBtn) excelGenerateBtn.addEventListener("click", runExcelEngine);

const excelCopyBtn = $("excelCopyBtn");
if (excelCopyBtn) excelCopyBtn.addEventListener("click", async () => {
  const text = $("excelOutput") ? $("excelOutput").textContent : "";
  if (!text || text.startsWith("Your generated")) { setStatus("excelStatus", "Generate an output first, then use Copy."); return; }
  try {
    await navigator.clipboard.writeText(text);
    setStatus("excelStatus", "Copied to clipboard.");
  } catch (e) {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand("copy"); ta.remove();
    setStatus("excelStatus", "Copied to clipboard (fallback).");
  }
});

/* ---------- v4: Formula / VBA / Regex / DAX wizards (parameterized templates, not AI) ---------- */

(function initRegex() {
  const taskSel = $("regexTask"), btn = $("regexBtn"), out = $("regexOutput");
  if (!taskSel || !btn) return;
  btn.addEventListener("click", () => {
    const t = REGEX_TASKS[taskSel.value]; if (!t) return;
    const pattern = t.build();
    const test = $("regexTest") ? $("regexTest").value : "";
    let matches = "";
    try { const found = test ? (test.match(new RegExp(pattern, "g")) || []) : []; matches = found.length ? "\n\nMatches in your test text: " + found.join(", ") : (test ? "\n\nNo matches in your test text." : ""); }
    catch (e) { matches = "\n\nCould not test this pattern."; }
    if (out) out.textContent = "AK Premium - Regex: " + t.name + "\n\nPattern: " + pattern + "\n\nWhat it does: " + t.explain + "\n\nExample: " + t.example + matches + "\n\nUse it in Excel with a VBA regex, in Google Sheets with REGEXEXTRACT, or in any text editor that supports regular expressions.";
    setStatus("regexStatus", "Done. Your pattern is ready above.");
  });
})();

const DAX_TASKS = {
  totalsales: { name: "Total Sales — sum a column", fields: [["f_table", "Table name", "Sales"], ["f_column", "Amount column", "Amount"]],
    build: (v) => "Total Sales = SUM(" + v.f_table + "[" + v.f_column + "])",
    explain: "Adds up every value in the amount column.",
    example: "Total Sales = SUM(Sales[Amount])." },
  average: { name: "Average — average a column", fields: [["f_table", "Table name", "Sales"], ["f_column", "Column to average", "Amount"]],
    build: (v) => "Average Amount = AVERAGE(" + v.f_table + "[" + v.f_column + "])",
    explain: "Averages the values in the column, ignoring blanks.",
    example: "Average Amount = AVERAGE(Sales[Amount])." },
  ytd: { name: "Year to Date — running total for the year", fields: [["f_table", "Table name", "Sales"], ["f_measure", "Base measure name", "Total Sales"], ["f_date", "Date table and column", "'Calendar'[Date]"]],
    build: (v) => "YTD Sales = TOTALYTD([" + v.f_measure + "], " + v.f_date + ")",
    explain: "Adds up the base measure from 1 January to the current date in the filter context.",
    example: "YTD Sales = TOTALYTD([Total Sales], 'Calendar'[Date]). Needs a date table." },
  pcttotal: { name: "Percent of Total — share of the grand total", fields: [["f_table", "Table name", "Sales"], ["f_measure", "Base measure name", "Total Sales"]],
    build: (v) => "% of Total = DIVIDE([" + v.f_measure + "], CALCULATE([" + v.f_measure + "], ALL(" + v.f_table + ")))",
    explain: "Divides the measure by the same measure with all filters on the table removed, so you get the share of the total.",
    example: "A product with 25,000 of 100,000 total sales shows 25%." },
  countrows: { name: "Count Rows — count orders or records", fields: [["f_table", "Table name", "Sales"]],
    build: (v) => "Order Count = COUNTROWS(" + v.f_table + ")",
    explain: "Counts the rows in the table in the current filter context.",
    example: "Order Count = COUNTROWS(Sales)." }
};
initWizard("dax", DAX_TASKS, "daxOutput", "daxStatus");

/* ---------- v4: standalone Formula Explainer page ---------- */

(function initExplainerPage() {
  const btn = $("explainerBtn"); if (!btn) return;
  btn.addEventListener("click", () => {
    const input = ($("explainerInput") || {}).value || "";
    if (!input.trim()) { setStatus("explainerStatus", "Please paste a formula starting with = first."); return; }
    const out = $("explainerOutput");
    if (out) out.textContent = explainFormula(input);
    setStatus("explainerStatus", "Done.");
  });
})();

/* v4 tool pages: each tool page embeds exactly one workspace, and the
   v3 CSS hides .workspace-tool until it gains .active (which only
   happened on homepage card clicks). A tool page has no cards and no
   #tool- hash, so without this the tool area stays an empty white box.
   Activate the single workspace on any /tools/ page. */
