/* AK Premium v12 — word-to-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Converters ---------- */

function wordHtmlRuns(node) {
  const runs = [];
  const walk = (n, bold, italic) => {
    if (n.nodeType === 3) {
      const text = n.nodeValue || "";
      if (!text) return;
      const last = runs[runs.length - 1];
      if (last && last.bold === bold && last.italic === italic) last.text += text;
      else runs.push({ text, bold, italic });
      return;
    }
    if (n.nodeType !== 1) return;
    const tag = (n.tagName || "").toLowerCase();
    const b = bold || tag === "strong" || tag === "b";
    const i = italic || tag === "em" || tag === "i";
    for (let k = 0; k < n.childNodes.length; k++) walk(n.childNodes[k], b, i);
  };
  walk(node, false, false);
  return runs;
}

function parseWordHtml(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const blocks = [];
  const body = doc.body;
  if (!body) return blocks;
  Array.from(body.childNodes).forEach((n) => {
    if (n.nodeType !== 1) {
      const t = (n.nodeValue || "").trim();
      if (t) blocks.push({ type: "p", runs: [{ text: t, bold: false, italic: false }] });
      return;
    }
    const tag = (n.tagName || "").toLowerCase();
    if (tag === "h1" || tag === "h2" || tag === "h3") blocks.push({ type: tag, runs: wordHtmlRuns(n) });
    else if (tag === "p") {
      // mammoth wraps pictures in a paragraph: pull the image out as its
      // own block, and keep any text in the same paragraph as well
      const imgs = Array.from(n.querySelectorAll("img"));
      if (imgs.length) {
        imgs.forEach((im) => blocks.push({ type: "img", src: im.getAttribute("src") || "", alt: im.getAttribute("alt") || "" }));
        const runs = wordHtmlRuns(n).filter((r) => r.text.trim());
        if (runs.length) blocks.push({ type: "p", runs });
      } else blocks.push({ type: "p", runs: wordHtmlRuns(n) });
    }
    else if (tag === "ul" || tag === "ol") {
      blocks.push({ type: tag, items: Array.from(n.querySelectorAll("li")).map((li) => wordHtmlRuns(li)) });
    } else if (tag === "table") {
      const rows = Array.from(n.querySelectorAll("tr")).map((tr) => Array.from(tr.querySelectorAll("th, td")).map((c) => c.textContent.trim()));
      if (rows.length) blocks.push({ type: "table", rows });
    } else if (tag === "img") {
      blocks.push({ type: "img", src: n.getAttribute("src") || "", alt: n.getAttribute("alt") || "" });
    } else if (tag === "hr") blocks.push({ type: "hr" });
    else blocks.push({ type: "p", runs: wordHtmlRuns(n) });
  });
  return blocks;
}
/* Draw parsed Word blocks into a jsPDF doc with header/footer and page
   numbers. opts: {pageW, pageH, margin, topY, bottomY, header, footer,
   pageNums}. Returns {headings: [{text, level, page}], pages}. */

async function layoutWordBlocks(doc, blocks, opts) {
  const o = Object.assign({ pageW: 595.28, pageH: 841.89, margin: 36, topY: 36, bottomY: 787.89, header: "", footer: "", pageNums: true }, opts || {});
  const maxW = o.pageW - o.margin * 2;
  const headings = [];
  let y = o.topY;
  const drawHeaderFooter = (pageNum) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(0, 0, 0);
    if (o.header) doc.text(o.header, o.margin, o.margin);
    if (o.footer || o.pageNums) {
      const f = (o.footer ? o.footer + "  " : "") + (o.pageNums ? "Page " + pageNum + " of {total}" : "");
      doc.text(f, o.margin, o.pageH - 18);
    }
  };
  drawHeaderFooter(doc.getNumberOfPages());
  const ensureSpace = (needed) => {
    if (y + needed > o.bottomY) { doc.addPage(); y = o.topY; drawHeaderFooter(doc.getNumberOfPages()); }
  };
  const onNewPage = (d) => drawHeaderFooter(d.getNumberOfPages());
  const runText = (runs) => (runs || []).map((r) => r.text).join("");
  for (const b of blocks) {
    if (b.type === "h1" || b.type === "h2" || b.type === "h3") {
      const level = b.type === "h1" ? 1 : b.type === "h2" ? 2 : 3;
      const size = level === 1 ? 20 : level === 2 ? 16 : 14;
      ensureSpace(size * 2);
      headings.push({ text: runText(b.runs), level, page: doc.getNumberOfPages() });
      y = drawRichTextRuns(doc, b.runs, { x: o.margin, y, maxWidth: maxW, size, lineHeight: size * 1.4, pageH: o.pageH, bottomMargin: o.pageH - o.bottomY, topMargin: o.topY, onPage: onNewPage }) + 6;
    } else if (b.type === "p") {
      if (!runText(b.runs).trim()) { y += 7; continue; }
      y = drawRichTextRuns(doc, b.runs, { x: o.margin, y, maxWidth: maxW, size: 12, lineHeight: 7, pageH: o.pageH, bottomMargin: o.pageH - o.bottomY, topMargin: o.topY, onPage: onNewPage }) + 4;
    } else if (b.type === "ul" || b.type === "ol") {
      b.items.forEach((runs, idx) => {
        ensureSpace(14);
        const prefix = b.type === "ul" ? "•  " : (idx + 1) + ".  ";
        y = drawRichTextRuns(doc, [{ text: prefix, bold: false, italic: false }].concat(runs), { x: o.margin + 12, y, maxWidth: maxW - 12, size: 12, lineHeight: 7, pageH: o.pageH, bottomMargin: o.pageH - o.bottomY, topMargin: o.topY, onPage: onNewPage }) + 2;
      });
      y += 4;
    } else if (b.type === "table") {
      if (typeof doc.autoTable === "function") {
        const head = [b.rows[0].map((c) => ({ content: c, styles: { fontStyle: "bold" } }))];
        const body = b.rows.slice(1).map((row) => row.map((c) => ({ content: c })));
        ensureSpace(30);
        doc.autoTable({ head, body, startY: y, margin: { left: o.margin, right: o.margin }, styles: { fontSize: 9, cellPadding: 3 }, headStyles: { fillColor: [41, 98, 168], textColor: 255, fontStyle: "bold" }, didDrawPage: () => drawHeaderFooter(doc.getNumberOfPages()) });
        y = doc.lastAutoTable.finalY + 8;
        if (y > o.bottomY) { doc.addPage(); y = o.topY; drawHeaderFooter(doc.getNumberOfPages()); }
      } else {
        b.rows.forEach((row) => {
          y = drawRichTextRuns(doc, [{ text: row.join("  |  "), bold: false, italic: false }], { x: o.margin, y, maxWidth: maxW, size: 10, lineHeight: 6, pageH: o.pageH, bottomMargin: o.pageH - o.bottomY, topMargin: o.topY, onPage: onNewPage });
        });
        y += 4;
      }
    } else if (b.type === "img" && b.src) {
      const fmt = b.src.indexOf("image/png") !== -1 ? "PNG" : b.src.indexOf("image/jpeg") !== -1 || b.src.indexOf("image/jpg") !== -1 ? "JPEG" : null;
      if (fmt) {
        const dims = await imageBlobDimensions(new Blob([dataUrlToBytes(b.src)]));
        let w = maxW, h = maxW * 0.6;
        if (dims) { const s = Math.min(1, maxW / dims.width); w = dims.width * s; h = dims.height * s; }
        ensureSpace(h + 8);
        doc.addImage(b.src, fmt, o.margin, y, w, h);
        y += h + 8;
      }
    } else if (b.type === "hr") {
      ensureSpace(14);
      doc.setDrawColor(180, 180, 180); doc.line(o.margin, y, o.pageW - o.margin, y);
      y += 10;
    }
  }
  return { headings, pages: doc.getNumberOfPages() };
}

const wordPdfBtn = $("wordPdfBtn");
if (wordPdfBtn) wordPdfBtn.addEventListener("click", async () => {
  const file = ($("wordPdfInput").files || [])[0];
  if (!file) { setError("wordPdfStatus", "Please select a Word (.docx) file first."); return; }
  const JsPDF = getJsPdf();
  if (!needLibrary(!!JsPDF, "jsPDF", "wordPdfStatus") || !needLibrary(!!window.mammoth, "mammoth", "wordPdfStatus")) return;
  try {
    const data = await readAsArrayBuffer(file);
    const result = await window.mammoth.convertToHtml({ arrayBuffer: data }, {
      convertImage: window.mammoth.images.imgElement(async (image) => {
        const b64 = await image.read("base64");
        return { src: "data:" + image.contentType + ";base64," + b64 };
      })
    });
    if (!result.value || !result.value.trim()) { setError("wordPdfStatus", "No text was found in this Word file. Nothing to convert."); return; }
    if (typeof new JsPDF().autoTable !== "function") await loadLibrary("jspdf-autotable", "wordPdfStatus");
    const blocks = parseWordHtml(result.value);
    const header = ($("wordPdfHeader") && $("wordPdfHeader").value || "").trim();
    const footer = ($("wordPdfFooter") && $("wordPdfFooter").value || "").trim();
    const pageNums = !($("wordPdfPageNums") && !$("wordPdfPageNums").checked);
    const wantToc = !!($("wordPdfToc") && $("wordPdfToc").checked);
    const pageW = 595.28, pageH = 841.89, margin = 36;
    const topY = header ? margin + 18 : margin;
    const bottomY = pageH - margin - ((footer || pageNums) ? 18 : 0);
    const opts = { pageW, pageH, margin, topY, bottomY, header, footer, pageNums };
    // pass 1: lay the document out to learn which page each heading lands on
    const doc1 = new JsPDF({ unit: "pt", format: "a4" });
    const pass1 = await layoutWordBlocks(doc1, blocks, opts);
    let doc = doc1, headingPages = pass1.headings;
    // pass 2: if a table of contents was asked for, rebuild with a TOC page first
    if (wantToc && pass1.headings.length) {
      const linesPerPage = Math.max(10, Math.floor((bottomY - topY) / 14));
      const tocPages = Math.max(1, Math.ceil((pass1.headings.length + 2) / linesPerPage));
      doc = new JsPDF({ unit: "pt", format: "a4" });
      doc.setFont("helvetica", "bold"); doc.setFontSize(20);
      doc.text("Contents", margin, topY);
      let ty = topY + 28;
      doc.setFont("helvetica", "normal"); doc.setFontSize(12);
      pass1.headings.forEach((h) => {
        if (ty > bottomY) { doc.addPage(); ty = topY; }
        const indent = (h.level - 1) * 14;
        doc.text(h.text, margin + indent, ty);
        doc.text(String(h.page + tocPages), pageW - margin, ty, { align: "right" });
        ty += 14;
      });
      doc.addPage();
      headingPages = pass1.headings.map((h) => ({ text: h.text, level: h.level, page: h.page + tocPages }));
      await layoutWordBlocks(doc, blocks, opts);
    }
    if (typeof doc.putTotalPages === "function") doc.putTotalPages("{total}");
    doc.save("ak-premium-word-to-pdf.pdf");
    setStatus("wordPdfStatus", "Done. PDF downloaded (" + pass1.pages + " page(s), " + headingPages.length + " heading(s)" + (wantToc && pass1.headings.length ? ", with a table of contents" : "") + "). Exact Word fonts and layout are not kept — check the pages before sharing.");
  } catch (e) { setError("wordPdfStatus", "Could not convert this Word file to PDF."); }
});

/* Read a .pptx via JSZip and return one entry per slide with its size
   (points), shapes (position + paragraphs of styled runs) and images.
   Positions come from the slide XML (a:off/a:ext, EMU → pt, /12700);
   colours from solidFill srgbClr; font sizes from a:rPr sz (1/100 pt).
   Tag lookup is by local name (getElementsByTagNameNS) because the XML
   uses p:/a: prefixes that CSS selectors cannot match. */
