/* AK Premium v12 — create-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- PDF Studio ---------- */

function mdInlineRuns(inlineTokens) {
  const runs = [];
  const walk = (toks, bold, italic, code) => {
    for (const t of toks || []) {
      if (t.type === "text") { if (t.text) runs.push({ text: t.text, bold, italic, code }); }
      else if (t.type === "strong") walk(t.tokens, true, italic, code);
      else if (t.type === "em") walk(t.tokens, bold, true, code);
      else if (t.type === "codespan") { if (t.text) runs.push({ text: t.text, bold, italic, code: true }); }
      else if (t.tokens) walk(t.tokens, bold, italic, code);
      else if (t.text) runs.push({ text: t.text, bold, italic, code });
    }
  };
  walk(inlineTokens, false, false, false);
  return runs;
}
/* Draw styled runs word-wrapped into a jsPDF doc. cursor = {doc, y, pageH,
   pageW, margin, font, size, lineH}; new pages are added as needed.
   Pure jsPDF text measuring, no canvas. Returns lines drawn. */

function drawStyledRuns(cursor, runs, indent) {
  const doc = cursor.doc;
  const x0 = cursor.margin + (indent || 0);
  const maxW = cursor.pageW - cursor.margin - x0;
  const words = [];
  for (const r of runs) {
    for (const w of String(r.text).split(/\s+/).filter(Boolean)) words.push({ text: w + " ", bold: r.bold, italic: r.italic, code: r.code });
  }
  const setRunFont = (w) => {
    doc.setFont(w.code ? "courier" : cursor.font, w.bold && w.italic ? "bolditalic" : w.bold ? "bold" : w.italic ? "italic" : "normal");
    doc.setFontSize(w.code ? Math.max(9, cursor.size - 2) : cursor.size);
  };
  let line = [], lineW = 0, lines = 0;
  const flush = () => {
    if (!line.length) return;
    if (cursor.y + cursor.lineH > cursor.pageH - cursor.margin) { doc.addPage(); cursor.y = cursor.margin + cursor.lineH; }
    let x = x0;
    for (const w of line) { setRunFont(w); doc.text(w.text, x, cursor.y); x += doc.getTextWidth(w.text); }
    cursor.y += cursor.lineH; lines++;
    line = []; lineW = 0;
  };
  for (const w of words) {
    setRunFont(w);
    const ww = doc.getTextWidth(w.text);
    if (line.length && lineW + ww > maxW) flush();
    line.push(w); lineW += ww;
  }
  flush();
  return lines;
}
/* Render Markdown text into a jsPDF doc: headings, paragraphs with inline
   bold/italic/code, bullet and numbered lists, tables (via jspdf-autotable),
   code blocks, blockquotes and horizontal rules. Unknown block types are
   skipped, never crash. Returns the cursor (final y). */

function renderMarkdownToPdf(doc, text, opts) {
  opts = Object.assign({ margin: 15, font: "helvetica", size: 12 }, opts || {});
  const tokens = window.marked.lexer(text);
  const cursor = { doc, y: opts.margin + 6, pageH: doc.internal.pageSize.getHeight(), pageW: doc.internal.pageSize.getWidth(), margin: opts.margin, font: opts.font, size: opts.size, lineH: opts.size * 1.4 * 25.4 / 72 };
  const need = (h) => { if (cursor.y + h > cursor.pageH - cursor.margin) { doc.addPage(); cursor.y = cursor.margin + cursor.lineH; } };
  for (const tk of tokens) {
    if (tk.type === "heading") {
      const hs = [22, 18, 15, 13, 12, 11][Math.min(tk.depth || 1, 6) - 1];
      need(hs * 1.4 * 25.4 / 72 + 2);
      doc.setFont(cursor.font, "bold"); doc.setFontSize(hs);
      for (const ln of doc.splitTextToSize(tk.text, cursor.pageW - cursor.margin * 2)) { need(cursor.lineH); doc.text(ln, cursor.margin, cursor.y); cursor.y += cursor.lineH; }
      cursor.y += 2;
      doc.setFont(cursor.font, "normal"); doc.setFontSize(cursor.size);
    } else if (tk.type === "paragraph") {
      need(cursor.lineH);
      drawStyledRuns(cursor, mdInlineRuns(tk.tokens), 0);
      cursor.y += 2;
    } else if (tk.type === "list") {
      tk.items.forEach((it, i) => {
        const bullet = tk.ordered ? ((tk.start || 1) + i) + ". " : "\u2022 ";
        need(cursor.lineH);
        drawStyledRuns(cursor, [{ text: bullet, bold: false, italic: false, code: false }].concat(mdInlineRuns(it.tokens)), 6);
        cursor.y += 1;
      });
      cursor.y += 2;
    } else if (tk.type === "table") {
      if (typeof doc.autoTable !== "function") continue;
      need(20);
      doc.autoTable({ head: [tk.header.map((c) => c.text)], body: tk.rows.map((r) => r.map((c) => c.text)), startY: cursor.y, margin: { left: cursor.margin, right: cursor.margin }, styles: { font: cursor.font, fontSize: Math.max(8, cursor.size - 2) }, headStyles: { fillColor: [31, 41, 55] } });
      cursor.y = doc.lastAutoTable.finalY + 4;
    } else if (tk.type === "code") {
      need(cursor.lineH);
      doc.setFont("courier", "normal"); doc.setFontSize(Math.max(9, cursor.size - 2));
      for (const ln of doc.splitTextToSize(tk.text, cursor.pageW - cursor.margin * 2 - 6)) { need(cursor.lineH); doc.text(ln, cursor.margin + 3, cursor.y); cursor.y += cursor.lineH; }
      cursor.y += 2;
      doc.setFont(cursor.font, "normal"); doc.setFontSize(cursor.size);
    } else if (tk.type === "blockquote") {
      const quote = (tk.tokens || []).filter((t) => t.type === "paragraph").map((p) => mdInlineRuns(p.tokens)).flat();
      if (quote.length) { need(cursor.lineH); drawStyledRuns(cursor, quote, 6); cursor.y += 2; }
    } else if (tk.type === "hr") {
      need(4); doc.setDrawColor(180); doc.line(cursor.margin, cursor.y, cursor.pageW - cursor.margin, cursor.y); cursor.y += 4;
    } else if (tk.type === "space") {
      cursor.y += 2;
    }
  }
  return cursor;
}

const createPdfBtn = $("createPdfBtn");
if (createPdfBtn) createPdfBtn.addEventListener("click", async () => {
  const JsPDF = getJsPdf();
  if (!needLibrary(!!JsPDF, "jsPDF", "createPdfStatus")) return;
  const text = ($("createText").value || "").trim();
  if (!text) { setError("createPdfStatus", "Please type some text first."); return; }
  const mode = $("createMode") ? $("createMode").value : "plain";
  const font = $("createFont") ? $("createFont").value : "helvetica";
  const size = Math.min(20, Math.max(8, parseInt(($("createFontSize") || {}).value || "12", 10) || 12));
  const pageSize = $("createPageSize") ? $("createPageSize").value : "a4";
  const margin = Math.min(40, Math.max(5, parseInt(($("createMargin") || {}).value || "15", 10) || 15));
  if (mode === "markdown") {
    if (!window.marked) { const ok = await loadLibrary("marked", "createPdfStatus"); if (!ok || !window.marked) return; }
    const probe = new JsPDF({ unit: "mm", format: pageSize });
    if (typeof probe.autoTable !== "function") { const ok = await loadLibrary("jspdf-autotable", "createPdfStatus"); if (!ok) return; }
  }
  try {
    const doc = new JsPDF({ unit: "mm", format: pageSize });
    const pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight();
    doc.setFont(font, "normal"); doc.setFontSize(size);
    if (mode === "markdown") {
      renderMarkdownToPdf(doc, text, { font, size, margin });
    } else {
      const cursor = { doc, y: margin + 6, pageH, pageW, margin, font, size, lineH: size * 1.4 * 25.4 / 72 };
      drawStyledRuns(cursor, [{ text, bold: false, italic: false, code: false }], 0);
    }
    const imgFiles = Array.from(($("createImageInput") && $("createImageInput").files) || []);
    for (const f of imgFiles) {
      if (!checkFileSize(f, "createPdfStatus")) return;
      const img = await loadImageFromFile(f);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width; canvas.height = img.naturalHeight || img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      doc.addPage(pageSize);
      const ratio = Math.min((pageW - margin * 2) / canvas.width, (pageH - margin * 2) / canvas.height);
      const w = canvas.width * ratio, h = canvas.height * ratio;
      doc.addImage(canvas.toDataURL("image/png"), "PNG", (pageW - w) / 2, (pageH - h) / 2, w, h);
    }
    doc.save("ak-premium-created.pdf");
    setStatus("createPdfStatus", "Done. PDF downloaded (" + doc.getNumberOfPages() + " page(s), " + (mode === "markdown" ? "Markdown" : "plain text") + (imgFiles.length ? ", " + imgFiles.length + " image(s) embedded" : "") + ").");
  } catch (e) { setError("createPdfStatus", "Could not create this PDF. Please check the text and try again."); }
});

/* Read the EXIF orientation tag (1-8) from a JPEG ArrayBuffer. Returns 1
   when there is no EXIF block, no orientation tag, or the file is not a
   JPEG. Pure parsing, no library. */
