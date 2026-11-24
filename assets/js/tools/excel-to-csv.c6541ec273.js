/* AK Premium v12 — excel-to-csv (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- New spreadsheet tools: Excel to CSV + CSV to Excel ---------- */

function aoaToCsv(rows, delim) {
  const q = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return (s.includes(delim) || s.includes('"') || s.includes("\n") || s.includes("\r")) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return rows.map((r) => r.map(q).join(delim)).join("\r\n");
}
let excelCsvWb = null;

const excelCsvInput = $("excelCsvInput");
if (excelCsvInput) excelCsvInput.addEventListener("change", async () => {
  const file = (excelCsvInput.files || [])[0];
  const sheetSel = $("excelCsvSheet");
  excelCsvWb = null;
  if (!file || !sheetSel) return;
  if (!window.XLSX) return;
  try {
    const data = await readAsArrayBuffer(file);
    excelCsvWb = window.XLSX.read(data, { type: "array" });
    sheetSel.innerHTML = excelCsvWb.SheetNames.map((n) => "<option value=\"" + n.replace(/&/g, "&amp;").replace(/"/g, "&quot;") + "\">" + n.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</option>").join("");
  } catch (e) { excelCsvWb = null; }
});
/* SheetJS CE does not read row hidden attributes (ws["!rows"] is always
   undefined after XLSX.read), so read them from the sheet XML directly:
   returns { sheetName: Set of 0-based hidden row indices }. */

async function hiddenRowsFromXlsx(data) {
  const map = {};
  try {
    const zip = await JSZip.loadAsync(data);
    const wbRels = await zip.file("xl/_rels/workbook.xml.rels").async("string");
    const relMap = {};
    const relRe = /<Relationship Id="([^"]+)"[^>]*Target="([^"]+)"/g;
    let m;
    while ((m = relRe.exec(wbRels))) relMap[m[1]] = m[2];
    const wbXml = await zip.file("xl/workbook.xml").async("string");
    const sheetRe = /<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"[^>]*\/>/g;
    while ((m = sheetRe.exec(wbXml))) {
      const target = relMap[m[2]] || "";
      const f = zip.file("xl/" + target.replace(/^\//, ""));
      if (!f) continue;
      const xml = await f.async("string");
      const hidden = new Set();
      const rowRe = /<row\b([^>]*)>/g;
      let rm;
      while ((rm = rowRe.exec(xml))) {
        const attrs = rm[1];
        if (!/hidden="(1|true)"/.test(attrs)) continue;
        const rMatch = attrs.match(/\br="(\d+)"/);
        if (rMatch) hidden.add(parseInt(rMatch[1], 10) - 1);
      }
      map[m[1]] = hidden;
    }
  } catch (e) { /* no hidden info: fall through with an empty map */ }
  return map;
}

const excelCsvBtn = $("excelCsvBtn");
if (excelCsvBtn) excelCsvBtn.addEventListener("click", async () => {
  const file = ($("excelCsvInput").files || [])[0];
  if (!file) { setError("excelCsvStatus", "Please select an Excel file first."); return; }
  if (!needLibrary(!!window.XLSX, "SheetJS", "excelCsvStatus")) return;
  try {
    const data = await readAsArrayBuffer(file);
    const wb = window.XLSX.read(data, { type: "array" });
    if (!wb.SheetNames || !wb.SheetNames.length) { setError("excelCsvStatus", "No sheets were found in this Excel file."); return; }
    const delim = $("excelCsvDelimiter") ? $("excelCsvDelimiter").value : ",";
    const bom = $("excelCsvBom") ? $("excelCsvBom").checked : true;
    const visibleOnly = $("excelCsvVisibleOnly") ? $("excelCsvVisibleOnly").checked : false;
    const skipEmpty = $("excelCsvSkipEmpty") ? $("excelCsvSkipEmpty").checked : true;
    const scope = $("excelCsvScope") ? $("excelCsvScope").value : "one";
    const sheetName = $("excelCsvSheet") ? $("excelCsvSheet").value : wb.SheetNames[0];
    const hiddenMap = visibleOnly ? await hiddenRowsFromXlsx(data) : {};
    const names = scope === "all" ? wb.SheetNames.slice() : [wb.SheetNames.includes(sheetName) ? sheetName : wb.SheetNames[0]];
    const cleanName = (n) => String(n).replace(/[\\/:*?"<>|]/g, "_");
    function sheetCsv(ws, name) {
      if (visibleOnly) {
        const rows = window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });
        const hidden = hiddenMap[name] || new Set();
        /* sheet_to_json rows are indexed from the sheet's first row, so
           shift by the !ref start row when the sheet does not start at 1. */
        const ref = ws["!ref"] || "A1";
        const startRow = parseInt(((ref.match(/^[A-Z]+(\d+)/) || [0, "1"])[1]), 10) || 1;
        const kept = rows.filter((r, i) => !hidden.has(i + startRow - 1));
        const out = skipEmpty ? kept.filter((r) => r.some((c) => String(c).trim() !== "")) : kept;
        return aoaToCsv(out, delim);
      }
      return window.XLSX.utils.sheet_to_csv(ws, { FS: delim, RS: "\r\n", blankrows: !skipEmpty });
    }
    const parts = [];
    for (const n of names) {
      const csv = sheetCsv(wb.Sheets[n], n);
      if (!csv.trim()) continue;
      parts.push({ name: cleanName(n) + ".csv", csv: (bom ? "\ufeff" : "") + csv });
    }
    if (!parts.length) { setError("excelCsvStatus", "The selected sheet(s) are empty. Nothing to export."); return; }
    if (parts.length === 1 && scope !== "all") {
      downloadText(parts[0].csv, "ak-premium-" + cleanName(names[0]) + ".csv", "text/csv;charset=utf-8");
      setStatus("excelCsvStatus", "Done. CSV downloaded (" + names[0] + ").");
      return;
    }
    if (!window.JSZip) { const ok = await loadLibrary("jszip", "excelCsvStatus"); if (!ok || !window.JSZip) return; }
    const zip = new window.JSZip();
    for (const p of parts) zip.file(p.name, p.csv);
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, "ak-premium-excel-to-csv.zip");
    setStatus("excelCsvStatus", "Done. " + parts.length + " sheet(s) downloaded as a ZIP file.");
  } catch (e) { setError("excelCsvStatus", "Could not convert this Excel file to CSV."); }
});

/* CSV to Excel: PapaParse delimiter auto-detect + first-rows preview,
   encoding auto-detect (BOM), type detection (numbers/dates/booleans as
   real types), header bold + freeze panes + AutoFilter, auto-fit widths,
   several CSVs into one workbook. */
