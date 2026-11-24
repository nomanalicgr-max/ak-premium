/* AK Premium v12 — csv-to-excel (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- New spreadsheet tools: Excel to CSV + CSV to Excel ---------- */

function detectCsvEncoding(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) return { encoding: "utf-8", skip: 3, label: "UTF-8 (BOM found)" };
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) return { encoding: "utf-16le", skip: 2, label: "UTF-16LE (BOM found)" };
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) return { encoding: "utf-16be", skip: 2, label: "UTF-16BE (BOM found)" };
  return { encoding: "utf-8", skip: 0, label: "UTF-8 (assumed, no BOM found)" };
}

function csvCellValue(raw) {
  const s = raw === null || raw === undefined ? "" : String(raw);
  const t = s.trim();
  if (t === "") return null;
  if (/^(true|false)$/i.test(t)) return t.toLowerCase() === "true";
  if (/^-?\d{4}-\d{2}-\d{2}$/.test(t)) { const d = new Date(t + "T00:00:00"); if (!isNaN(d)) return { v: d, z: "yyyy-mm-dd" }; }
  const dm = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dm) { const d = new Date(+dm[3], +dm[2] - 1, +dm[1]); if (!isNaN(d) && d.getDate() === +dm[1]) return { v: d, z: "yyyy-mm-dd" }; }
  if (/^-?\d+(\.\d+)?$/.test(t)) {
    if (/^0\d+$/.test(t) || t.replace(/[^0-9]/g, "").length > 15) return s; /* leading zero (phone/code) or too long for exact numbers: keep as text */
    return Number(t);
  }
  return s;
}

function csvSheetName(name, used) {
  let n = String(name || "Sheet1").replace(/[\[\]:*?\/\\]/g, "_").slice(0, 31) || "Sheet1";
  let out = n, i = 2;
  while (used.has(out)) { out = n.slice(0, 28) + "_" + i; i++; }
  used.add(out);
  return out;
}

function csvRowsToSheet(rows, opts) {
  const header = opts.header !== false;
  const dateCells = [];
  const aoa = rows.map((r, ri) => r.map((c, ci) => {
    const v = csvCellValue(c);
    if (v === null) return "";
    if (v && typeof v === "object" && v.v instanceof Date) { dateCells.push([ri, ci]); return v.v; }
    return v;
  }));
  const ws = window.XLSX.utils.aoa_to_sheet(aoa, { cellDates: true });
  for (const [ri, ci] of dateCells) {
    const addr = window.XLSX.utils.encode_cell({ r: ri, c: ci });
    if (ws[addr]) ws[addr].z = "yyyy-mm-dd";
  }
  const range = window.XLSX.utils.decode_range(ws["!ref"] || "A1");
  if (header && aoa.length) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = window.XLSX.utils.encode_cell({ r: 0, c });
      if (ws[addr]) ws[addr].s = { font: { bold: true } };
    }
    if (opts.freeze !== false) ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
    if (opts.filter !== false && aoa.length > 1) ws["!autofilter"] = { ref: ws["!ref"] };
  }
  if (opts.autofit !== false) {
    ws["!cols"] = [];
    for (let c = 0; c <= range.e.c; c++) {
      let w = 2;
      for (let r = 0; r < aoa.length; r++) {
        const cell = aoa[r][c];
        const len = cell instanceof Date ? 10 : cell === null || cell === undefined ? 0 : String(cell).length;
        if (len > w) w = len;
      }
      ws["!cols"].push({ wch: Math.min(w + 2, 50) });
    }
  }
  return ws;
}
/* csv-to-excel: SheetJS CE writes AutoFilter and column widths, but it
   drops cell styles (bold) and frozen panes. This post-processes the
   written .xlsx bytes: it adds a bold font + xf to styles.xml, marks the
   header-row cells with that style, and freezes the top row in each sheet
   view. Pure string surgery on the ZIP parts. */

async function styleCsvWorkbook(outBytes, opts) {
  const zip = await JSZip.loadAsync(outBytes);
  const stylesFile = zip.file("xl/styles.xml");
  if (!stylesFile) return outBytes;
  let styles = await stylesFile.async("string");
  const fontCount = parseInt((styles.match(/<fonts count="(\d+)">/) || [0, "0"])[1], 10);
  const xfCount = parseInt((styles.match(/<cellXfs count="(\d+)">/) || [0, "0"])[1], 10);
  const boldXf = xfCount; // index of the xf we are about to append
  styles = styles.replace(/<fonts count="\d+">/, '<fonts count="' + (fontCount + 1) + '">');
  styles = styles.replace("</fonts>", '<font><b/><sz val="12"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font></fonts>');
  styles = styles.replace(/<cellXfs count="\d+">/, '<cellXfs count="' + (xfCount + 1) + '">');
  styles = styles.replace("</cellXfs>", '<xf numFmtId="0" fontId="' + fontCount + '" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>');
  zip.file("xl/styles.xml", styles);
  const wbRels = await zip.file("xl/_rels/workbook.xml.rels").async("string");
  const relMap = {};
  const relRe = /<Relationship Id="([^"]+)"[^>]*Target="([^"]+)"/g;
  let m;
  while ((m = relRe.exec(wbRels))) relMap[m[1]] = m[2];
  const wbXml = await zip.file("xl/workbook.xml").async("string");
  const sheetRe = /<sheet[^>]*r:id="([^"]+)"[^>]*\/>/g;
  const sheetFiles = [];
  while ((m = sheetRe.exec(wbXml))) {
    const target = relMap[m[1]] || "";
    sheetFiles.push("xl/" + target.replace(/^\//, ""));
  }
  for (const path of sheetFiles) {
    const f = zip.file(path);
    if (!f) continue;
    let xml = await f.async("string");
    if (opts.freeze) {
      xml = xml.replace(/(<sheetView[^>]*>)/, '$1<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/>');
    }
    if (opts.bold) {
      xml = xml.replace(/(<row r="1"[^>]*>)([\s\S]*?)(<\/row>)/, function (all, open, cells, close) {
        const styled = cells.replace(/<c r="([A-Z]+\d+)"(?![^>]*\bs=)/g, '<c r="$1" s="' + boldXf + '"');
        return open + styled + close;
      });
    }
    zip.file(path, xml);
  }
  return await zip.generateAsync({ type: "uint8array" });
}

function csvParseText(text, delimOverride) {
  if (!window.Papa) return null;
  const opts = { header: false, skipEmptyLines: "greedy", dynamicTyping: false };
  if (delimOverride && delimOverride !== "auto") opts.delimiter = delimOverride;
  const res = window.Papa.parse(text, opts);
  if (res.errors && res.errors.length && !res.data.length) return { rows: [], delimiter: res.meta.delimiter || "", error: res.errors[0].message };
  return { rows: res.data.filter((r) => r.some((c) => String(c).trim() !== "")), delimiter: res.meta.delimiter || "" };
}

function csvDelimLabel(d) { return d === "," ? "comma (,)" : d === ";" ? "semicolon (;)" : d === "\t" ? "tab" : d === "|" ? "pipe (|)" : d ? JSON.stringify(d) : "not detected"; }

async function csvPreviewSource() {
  const file = ($("csvExcelInput").files || [])[0];
  const delimSel = $("csvExcelDelimiter") ? $("csvExcelDelimiter").value : "auto";
  let text = "", encLabel = "UTF-8 (pasted text)";
  if (file) {
    const bytes = new Uint8Array(await readAsArrayBuffer(file));
    const det = detectCsvEncoding(bytes);
    encLabel = det.label;
    text = new TextDecoder(det.encoding).decode(bytes.slice(det.skip));
  } else {
    text = ($("csvExcelText").value || "").trim();
  }
  return { text, encLabel, delimSel };
}

async function csvRunPreview() {
  const src = await csvPreviewSource();
  const prev = $("csvExcelPreview");
  if (!src.text) { if (prev) prev.innerHTML = ""; const n = $("csvExcelDetectNote"); if (n) n.textContent = ""; return; }
  if (!window.Papa) { const ok = await loadLibrary("papaparse", "csvExcelStatus"); if (!ok || !window.Papa) { if (prev) prev.textContent = "The CSV parser did not load. Check your connection and try again."; return; } }
  const parsed = csvParseText(src.text, src.delimSel);
  const note = $("csvExcelDetectNote");
  if (note) note.textContent = parsed && parsed.delimiter ? "Detected delimiter: " + csvDelimLabel(parsed.delimiter) + ". Encoding: " + src.encLabel + "." : "Delimiter: " + csvDelimLabel("") + ". Encoding: " + src.encLabel + ".";
  if (!parsed || !parsed.rows.length) { if (prev) prev.textContent = "No rows could be read from this CSV."; return; }
  if (prev) {
    const show = parsed.rows.slice(0, 6);
    prev.innerHTML = "<table><tbody>" + show.map((r) => "<tr>" + r.map((c) => "<td>" + escapeHtml(String(c)) + "</td>").join("") + "</tr>").join("") + "</tbody></table>" + (parsed.rows.length > 6 ? "<p>Showing the first 6 of " + parsed.rows.length + " rows.</p>" : "<p>" + parsed.rows.length + " row(s).</p>");
  }
}

const csvExcelPreviewBtn = $("csvExcelPreviewBtn");
if (csvExcelPreviewBtn) csvExcelPreviewBtn.addEventListener("click", () => { csvRunPreview().catch(() => setError("csvExcelStatus", "Could not preview this CSV.")); });

const csvExcelInputEl = $("csvExcelInput");
if (csvExcelInputEl) csvExcelInputEl.addEventListener("change", () => { csvRunPreview().catch(() => {}); });

const csvExcelBtn = $("csvExcelBtn");
if (csvExcelBtn) csvExcelBtn.addEventListener("click", async () => {
  if (!needLibrary(!!window.XLSX, "SheetJS", "csvExcelStatus")) return;
  const files = Array.from(($("csvExcelInput").files || []));
  try {
    let sources = [];
    if (files.length) {
      for (const f of files) {
        const bytes = new Uint8Array(await readAsArrayBuffer(f));
        const det = detectCsvEncoding(bytes);
        sources.push({ name: f.name.replace(/\.csv$/i, ""), text: new TextDecoder(det.encoding).decode(bytes.slice(det.skip)) });
      }
    } else {
      const pasted = ($("csvExcelText").value || "").trim();
      if (!pasted) { setError("csvExcelStatus", "Please upload a .csv file or paste CSV text first."); return; }
      sources.push({ name: "Sheet1", text: pasted });
    }
    const delimSel = $("csvExcelDelimiter") ? $("csvExcelDelimiter").value : "auto";
    const header = $("csvExcelHeader") ? $("csvExcelHeader").checked : true;
    const freeze = $("csvExcelFreeze") ? $("csvExcelFreeze").checked : true;
    const filter = $("csvExcelFilter") ? $("csvExcelFilter").checked : true;
    const autofit = $("csvExcelAutofit") ? $("csvExcelAutofit").checked : true;
    if (!window.Papa) { const ok = await loadLibrary("papaparse", "csvExcelStatus"); if (!ok || !window.Papa) return; }
    const wb = window.XLSX.utils.book_new();
    const used = new Set();
    let totalRows = 0;
    for (const src of sources) {
      const parsed = csvParseText(src.text, delimSel);
      let rows = parsed ? parsed.rows : [];
      if (!rows.length) {
        /* Fallback: simple line/comma split for plain CSV without quoted commas. */
        rows = src.text.split(/\r?\n/).filter((l) => l.trim()).map((l) => l.split(","));
      }
      const ws = csvRowsToSheet(rows, { header, freeze, filter, autofit });
      window.XLSX.utils.book_append_sheet(wb, ws, csvSheetName(src.name, used));
      totalRows += rows.length;
    }
    if (!totalRows) { setError("csvExcelStatus", "No rows could be read from this CSV."); return; }
    /* SheetJS CE drops bold and frozen panes on write, so post-process
       the bytes to add them back before downloading. */
    let out = window.XLSX.write(wb, { type: "array", bookType: "xlsx" });
    out = await styleCsvWorkbook(out, { bold: header, freeze: header && freeze });
    downloadBlob(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "ak-premium-csv-to-excel.xlsx");
    setStatus("csvExcelStatus", "Done. Excel file downloaded (" + sources.length + " sheet(s), " + totalRows + " row(s)).");
  } catch (e) { setError("csvExcelStatus", "Could not convert this CSV to Excel."); }
});
