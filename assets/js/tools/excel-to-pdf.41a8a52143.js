/* AK Premium v12 — excel-to-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Converters ---------- */

function excelChartData(rows) {
  if (!rows || rows.length < 2) return null;
  const header = rows[0];
  let valueIdx = -1;
  for (let c = 1; c < header.length; c++) {
    let nums = 0, total = 0;
    for (let r = 1; r < rows.length; r++) {
      const v = rows[r][c] && rows[r][c].v;
      if (v == null || v === "") continue;
      total++;
      if (typeof v === "number") nums++;
    }
    if (total > 0 && nums / total >= 0.8) { valueIdx = c; break; }
  }
  if (valueIdx === -1) return null;
  const labels = [], values = [];
  for (let r = 1; r < rows.length; r++) {
    const lv = rows[r][0] && rows[r][0].v;
    const vv = rows[r][valueIdx] && rows[r][valueIdx].v;
    if (typeof vv !== "number") continue;
    labels.push(String(lv == null ? "" : lv));
    values.push(vv);
  }
  if (!values.length) return null;
  const hv = header[valueIdx] && header[valueIdx].v;
  return { labels, values, valueLabel: String(hv != null ? hv : "Value") };
}

const excelPdfBtn = $("excelPdfBtn");
if (excelPdfBtn) excelPdfBtn.addEventListener("click", async () => {
  const file = ($("excelPdfInput").files || [])[0];
  if (!file) { setError("excelPdfStatus", "Please select an Excel file first."); return; }
  const JsPDF = getJsPdf();
  if (!needLibrary(!!JsPDF, "jsPDF", "excelPdfStatus") || !needLibrary(!!window.XLSX, "SheetJS", "excelPdfStatus")) return;
  try {
    const data = await readAsArrayBuffer(file);
    const wb = window.XLSX.read(data, { type: "array", cellStyles: true });
    if (!wb.SheetNames || !wb.SheetNames.length) { setError("excelPdfStatus", "No sheets were found in this Excel file."); return; }
    const orientation = $("excelOrientation") ? $("excelOrientation").value : "portrait";
    const fitPage = !($("excelFitPage") && !$("excelFitPage").checked);
    const chartType = $("excelChart") ? $("excelChart").value : "none";
    const doc = new JsPDF({ orientation, unit: "pt", format: "a4" });
    const pageW = orientation === "landscape" ? 841.89 : 595.28;
    const pageH = orientation === "landscape" ? 595.28 : 841.89;
    const margin = 36;
    const hexRgbArr = (rgb) => {
      const h = String(rgb || "").replace(/^#/, "");
      const s = h.length === 8 ? h.slice(2) : h;
      if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
      return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
    };
    const cellText = (cell) => {
      if (!cell) return "";
      if (cell.w != null) return String(cell.w);
      return String(cell.v == null ? "" : cell.v);
    };
    const cellStyles = (cell, isHeader) => {
      const st = {};
      const s = cell && cell.s;
      if (isHeader) st.fontStyle = "bold";
      if (s && s.font && s.font.bold) st.fontStyle = "bold";
      if (s && s.font && s.font.color && s.font.color.rgb) { const c = hexRgbArr(s.font.color.rgb); if (c) st.textColor = c; }
      if (s && s.fill && s.fill.fgColor && s.fill.fgColor.rgb) { const c = hexRgbArr(s.fill.fgColor.rgb); if (c) st.fillColor = c; }
      return st;
    };
    let chartInfo = "";
    let sheetCount = 0;
    for (let si = 0; si < wb.SheetNames.length; si++) {
      const name = wb.SheetNames[si];
      const sheet = wb.Sheets[name];
      if (!sheet || !sheet["!ref"]) continue;
      const range = window.XLSX.utils.decode_range(sheet["!ref"]);
      const rows = [];
      for (let r = range.s.r; r <= range.e.r; r++) {
        const row = [];
        for (let c = range.s.c; c <= range.e.c; c++) row.push(sheet[window.XLSX.utils.encode_cell({ r, c })] || null);
        rows.push(row);
      }
      if (!rows.length) continue;
      if (sheetCount > 0) doc.addPage([pageW, pageH], orientation);
      sheetCount++;
      doc.setFontSize(16); doc.setFont("helvetica", "bold");
      doc.text(name, margin, margin);
      const startY = margin + 18;
      // column widths from the longest formatted value in each column
      const colCount = Math.max.apply(null, rows.map((r) => r.length));
      const widths = [];
      for (let c = 0; c < colCount; c++) {
        let maxLen = 0;
        rows.forEach((row) => { const s = cellText(row[c]); if (s.length > maxLen) maxLen = s.length; });
        widths.push(Math.min(160, Math.max(36, maxLen * 6)));
      }
      const totalW = widths.reduce((a, b) => a + b, 0);
      const availW = pageW - margin * 2;
      const scale = fitPage && totalW > availW ? availW / totalW : 1;
      const columnStyles = {};
      widths.forEach((w, i) => { columnStyles[i] = { cellWidth: w * scale }; });
      if (typeof doc.autoTable !== "function") {
        const ok = await loadLibrary("jspdf-autotable", "excelPdfStatus");
        if (!ok || typeof doc.autoTable !== "function") { setError("excelPdfStatus", "The table library did not load. Check your connection and try again."); return; }
      }
      doc.autoTable({
        head: [rows[0].map((c, ci) => ({ content: cellText(c), styles: cellStyles(c, true) }))],
        body: rows.slice(1).map((row) => row.map((c, ci) => ({ content: cellText(c), styles: cellStyles(c, false) }))),
        startY, margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 3, lineWidth: 0.5, lineColor: [200, 200, 200] },
        headStyles: { fillColor: [41, 98, 168], textColor: 255, fontStyle: "bold" },
        columnStyles,
        didDrawPage: (d) => {
          doc.setFontSize(9); doc.setFont("helvetica", "normal");
          /* d.pageNumber is per-table (each table starts at 1), so the
             document page comes from the doc itself */
          doc.text("Page " + doc.getNumberOfPages() + " of {total}", pageW - margin, pageH - 18, { align: "right" });
        }
      });
      // chart from the first sheet only, drawn from the first numeric column
      if (si === 0 && chartType !== "none") {
        const cd = excelChartData(rows);
        if (!cd) chartInfo = " No numeric column was found for a chart.";
        else {
          if (!window.Chart) await loadLibrary("chartjs", "excelPdfStatus");
          if (!window.Chart) chartInfo = " The chart library did not load, so no chart was added.";
          else {
            const canvas = document.createElement("canvas");
            canvas.width = 900; canvas.height = 450;
            new window.Chart(canvas.getContext("2d"), {
              type: chartType,
              data: { labels: cd.labels, datasets: [{ label: cd.valueLabel, data: cd.values, backgroundColor: "rgba(41,98,168,0.7)", borderColor: "rgba(41,98,168,1)", borderWidth: 1 }] },
              options: { responsive: false, animation: false, plugins: { legend: { display: false } } }
            });
            const img = canvas.toDataURL("image/png");
            let cy = (doc.lastAutoTable ? doc.lastAutoTable.finalY : startY) + 16;
            if (cy + 200 > pageH - margin) { doc.addPage([pageW, pageH], orientation); cy = margin; }
            doc.addImage(img, "PNG", margin, cy, pageW - margin * 2, (pageW - margin * 2) * 0.5);
            chartInfo = " Chart added from the " + cd.valueLabel + " column.";
          }
        }
      }
    }
    if (!sheetCount) { setError("excelPdfStatus", "No sheet with data was found in this Excel file."); return; }
    if (typeof doc.putTotalPages === "function") doc.putTotalPages("{total}");
    doc.save("ak-premium-excel-to-pdf.pdf");
    setStatus("excelPdfStatus", "Done. PDF downloaded (" + sheetCount + " sheet(s), all sheets with their own heading)." + chartInfo);
  } catch (e) { setError("excelPdfStatus", "Could not convert this Excel file to PDF."); }
});

/* Draw runs of styled text with word wrap, switching the jsPDF font per
   word and flowing across pages. Used by Word to PDF and PPT to PDF, so
   it lives in core. runs: [{text, bold, italic, size, color}]. Returns
   the y position after the last line. opts: {x, y, maxWidth, size,
   lineHeight, pageH, bottomMargin, topMargin, align ("left"|"center"|
   "right"), onPage(doc)} — onPage runs after each new page so the caller
   can redraw a header or footer. */
