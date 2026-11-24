/* AK Premium v12 — txt-html-to-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Converters ---------- */

function txtHtmlHeaderFooter(doc, header, footer, pageNums, pageW, pageH, margin) {
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(0, 0, 0);
  if (header) doc.text(header, margin, margin);
  if (footer || pageNums) {
    const f = (footer ? footer + "  " : "") + (pageNums ? "Page " + doc.getNumberOfPages() + " of {total}" : "");
    doc.text(f, margin, pageH - 18);
  }
}
/* marked inline tokens (text, strong, em, codespan, link) → styled runs. */

function txtMdInlineRuns(tokens) {
  const runs = [];
  (tokens || []).forEach((t) => {
    if (t.type === "text" || t.type === "codespan") runs.push({ text: t.text || "", bold: false, italic: false });
    else if (t.type === "strong") runs.push.apply(runs, txtMdInlineRuns(t.tokens).map((r) => ({ text: r.text, bold: true, italic: r.italic })));
    else if (t.type === "em") runs.push.apply(runs, txtMdInlineRuns(t.tokens).map((r) => ({ text: r.text, bold: r.bold, italic: true })));
    else if (t.type === "link") runs.push.apply(runs, txtMdInlineRuns(t.tokens));
    else if (t.text) runs.push({ text: t.text, bold: false, italic: false });
  });
  return runs;
}
/* Markdown input → styled PDF: headings, bold/italic, lists, tables
   (via jspdf-autotable), code blocks, quotes, plus the header/footer. */

async function txtHtmlMarkdownToPdf(raw, opts, statusId) {
  const JsPDF = getJsPdf();
  const doc = new JsPDF({ unit: "pt", format: "a4" });
  const pageW = 595.28, pageH = 841.89, margin = 36;
  const topY = opts.header ? margin + 18 : margin;
  const bottomY = pageH - margin - ((opts.footer || opts.pageNums) ? 18 : 0);
  const maxW = pageW - margin * 2;
  txtHtmlHeaderFooter(doc, opts.header, opts.footer, opts.pageNums, pageW, pageH, margin);
  let y = topY;
  const onNewPage = (d) => txtHtmlHeaderFooter(d, opts.header, opts.footer, opts.pageNums, pageW, pageH, margin);
  const drawOpts = { pageH, bottomMargin: pageH - bottomY, topMargin: topY, onPage: onNewPage };
  if (typeof doc.autoTable !== "function") await loadLibrary("jspdf-autotable", statusId);
  const tokens = window.marked.lexer(raw);
  for (const tok of tokens) {
    if (tok.type === "heading") {
      const size = tok.depth === 1 ? 20 : tok.depth === 2 ? 16 : 14;
      if (y + size * 2 > bottomY) { doc.addPage(); y = topY; onNewPage(doc); }
      y = drawRichTextRuns(doc, txtMdInlineRuns(tok.tokens), Object.assign({ x: margin, y, maxWidth: maxW, size, lineHeight: size * 1.4 }, drawOpts)) + 6;
    } else if (tok.type === "paragraph") {
      y = drawRichTextRuns(doc, txtMdInlineRuns(tok.tokens), Object.assign({ x: margin, y, maxWidth: maxW, size: 12, lineHeight: 7 }, drawOpts)) + 4;
    } else if (tok.type === "list") {
      for (let i = 0; i < tok.items.length; i++) {
        const it = tok.items[i];
        const prefix = tok.ordered ? ((tok.start || 1) + i) + ".  " : "•  ";
        if (y + 14 > bottomY) { doc.addPage(); y = topY; onNewPage(doc); }
        y = drawRichTextRuns(doc, [{ text: prefix, bold: false, italic: false }].concat(txtMdInlineRuns(it.tokens)), Object.assign({ x: margin + 12, y, maxWidth: maxW - 12, size: 12, lineHeight: 7 }, drawOpts)) + 2;
      }
      y += 4;
    } else if (tok.type === "table") {
      if (typeof doc.autoTable === "function") {
        const head = [tok.header.map((c) => ({ content: c.text, styles: { fontStyle: "bold" } }))];
        const body = tok.rows.map((row) => row.map((c) => ({ content: c.text })));
        if (y + 30 > bottomY) { doc.addPage(); y = topY; onNewPage(doc); }
        doc.autoTable({ head, body, startY: y, margin: { left: margin, right: margin }, styles: { fontSize: 9, cellPadding: 3 }, headStyles: { fillColor: [41, 98, 168], textColor: 255, fontStyle: "bold" }, didDrawPage: (d) => txtHtmlHeaderFooter(doc, opts.header, opts.footer, opts.pageNums, pageW, pageH, margin) });
        y = doc.lastAutoTable.finalY + 8;
        if (y > bottomY) { doc.addPage(); y = topY; onNewPage(doc); }
      } else {
        tok.rows.forEach((row) => {
          y = drawRichTextRuns(doc, [{ text: row.map((c) => c.text).join("  |  "), bold: false, italic: false }], Object.assign({ x: margin, y, maxWidth: maxW, size: 10, lineHeight: 6 }, drawOpts));
        });
        y += 4;
      }
    } else if (tok.type === "code") {
      const lines = String(tok.text || "").split("\n");
      for (const line of lines) {
        if (y + 8 > bottomY) { doc.addPage(); y = topY; onNewPage(doc); }
        doc.setFont("courier", "normal"); doc.setFontSize(10);
        doc.text(line, margin, y); y += 7;
      }
      y += 4;
    } else if (tok.type === "blockquote") {
      y = drawRichTextRuns(doc, txtMdInlineRuns(tok.tokens), Object.assign({ x: margin + 12, y, maxWidth: maxW - 12, size: 12, lineHeight: 7 }, drawOpts)) + 4;
    } else if (tok.type === "hr") {
      if (y + 14 > bottomY) { doc.addPage(); y = topY; onNewPage(doc); }
      doc.setDrawColor(180, 180, 180); doc.line(margin, y, pageW - margin, y);
      y += 10;
    } else if (tok.type === "space") {
      y += 7;
    }
  }
  if (typeof doc.putTotalPages === "function") doc.putTotalPages("{total}");
  doc.save("ak-premium-text-to-pdf.pdf");
  return doc.getNumberOfPages();
}
/* Plain-text input → PDF with the same header/footer and page numbers. */

function txtHtmlPlainToPdf(raw, opts, statusId) {
  const JsPDF = getJsPdf();
  const doc = new JsPDF({ unit: "pt", format: "a4" });
  const pageW = 595.28, pageH = 841.89, margin = 36;
  const topY = opts.header ? margin + 18 : margin;
  const bottomY = pageH - margin - ((opts.footer || opts.pageNums) ? 18 : 0);
  txtHtmlHeaderFooter(doc, opts.header, opts.footer, opts.pageNums, pageW, pageH, margin);
  drawRichTextRuns(doc, [{ text: raw, bold: false, italic: false }], {
    x: margin, y: topY, maxWidth: pageW - margin * 2, size: 12, lineHeight: 7,
    pageH, bottomMargin: pageH - bottomY, topMargin: topY,
    onPage: (d) => txtHtmlHeaderFooter(d, opts.header, opts.footer, opts.pageNums, pageW, pageH, margin)
  });
  if (typeof doc.putTotalPages === "function") doc.putTotalPages("{total}");
  doc.save("ak-premium-text-to-pdf.pdf");
  return doc.getNumberOfPages();
}

const txtHtmlPdfBtn = $("txtHtmlPdfBtn");
if (txtHtmlPdfBtn) txtHtmlPdfBtn.addEventListener("click", async () => {
  const raw = ($("txtHtmlInput").value || "").trim();
  if (!raw) { setError("txtHtmlPdfStatus", "Please paste some text or simple HTML first."); return; }
  const mode = ($("txtHtmlMode") && $("txtHtmlMode").value) || "text";
  const header = ($("txtHtmlHeader") && $("txtHtmlHeader").value || "").trim();
  const footer = ($("txtHtmlFooter") && $("txtHtmlFooter").value || "").trim();
  const pageNums = !($("txtHtmlPageNums") && !$("txtHtmlPageNums").checked);
  const opts = { header, footer, pageNums };
  try {
    let pages = 0;
    if (mode === "markdown") {
      if (!window.marked) { const ok = await loadLibrary("marked", "txtHtmlPdfStatus"); if (!ok || !window.marked) { setError("txtHtmlPdfStatus", "The Markdown library did not load. Check your connection and try again."); return; } }
      pages = await txtHtmlMarkdownToPdf(raw, opts, "txtHtmlPdfStatus");
      setStatus("txtHtmlPdfStatus", "Done. PDF downloaded (" + pages + " page(s)) from your Markdown, with headings, lists and tables kept" + (header || footer ? ", plus the header and footer you typed" : "") + ".");
    } else {
      pages = txtHtmlPlainToPdf(raw, opts, "txtHtmlPdfStatus");
      setStatus("txtHtmlPdfStatus", "Done. PDF downloaded (" + pages + " page(s))" + (header || footer ? " with the header and footer you typed" : "") + ".");
    }
  } catch (e) { setError("txtHtmlPdfStatus", "Could not make this PDF."); }
});

/* Clean pasted or uploaded HTML before it is rendered: scripts, frames,
   embeds and external stylesheets are removed (they cannot run or load
   from a saved file), and event-handler attributes plus javascript: links
   are stripped, so a saved page cannot run code on this page. Inline
   <style> blocks and style attributes are kept, because html2canvas
   needs them to render headings, bold text and tables. Returns the
   cleaned inner HTML of the document body. */
