/* AK Premium v12 — pdf-to-ppt (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Converters ---------- */

const pdfPptBtn = $("pdfPptBtn");
if (pdfPptBtn) pdfPptBtn.addEventListener("click", async () => {
  const file = ($("pdfPptInput").files || [])[0];
  if (!file) { setError("pdfPptStatus", "Please select a PDF file first."); return; }
  if (!needLibrary(!!window.PptxGenJS, "PptxGenJS", "pdfPptStatus")) return;
  try {
    const layout = await extractPdfLayout(file, "pdfPptStatus");
    if (layout === null) return;
    if (!layout.some((pg) => pg.lines.length)) { setError("pdfPptStatus", "No readable text was found in this PDF. It may be a scanned PDF — try OCR PDF first."); return; }
    const tablePages = await extractPdfTableItems(file, "pdfPptStatus");
    const tables = tablePages ? detectPdfTables(tablePages) : [];
    const images = await extractPdfImages(file, "pdfPptStatus");
    const pptx = new window.PptxGenJS();
    pptx.defineLayout({ name: "WIDE169", width: 13.33, height: 7.5 });
    pptx.layout = "WIDE169";
    let notesCount = 0, imageCount = 0, tableCount = 0;
    for (const pg of layout) {
      const slide = pptx.addSlide();
      const medH = median.apply(null, pg.lines.map((l) => Math.max.apply(null, l.items.map((i) => i.h))));
      const pgTables = tables.filter((t) => t.page === pg.page);
      // title: the largest line on the page, else the first line
      let titleIdx = pg.lines.findIndex((l) => Math.max.apply(null, l.items.map((i) => i.h)) >= medH * 1.3);
      if (titleIdx === -1) titleIdx = 0;
      const titleLine = pg.lines[titleIdx];
      slide.addText(titleLine.text, { x: 0.5, y: 0.3, w: 12.33, fontSize: 24, bold: true });
      const bodyLines = pg.lines.filter((l, i) => i !== titleIdx);
      // tables: lines covered by a grid-detected table become a real table
      const emittedTables = [];
      const covered = new Set();
      bodyLines.forEach((l, i) => {
        const tb = pgTables.find((t) => t.rowYs.some((ry) => Math.abs(ry - l.y) < 3));
        if (!tb) return;
        covered.add(i);
        if (!emittedTables.includes(tb)) emittedTables.push(tb);
      });
      const textLines = bodyLines.filter((l, i) => !covered.has(i));
      // bullets: lines indented past the page's left text edge become bullets
      const minX = textLines.length ? Math.min.apply(null, textLines.map((l) => l.items[0].x)) : 0;
      const textObjs = textLines.map((l) => {
        const bold = l.items.some((it) => /bold/i.test(it.font || ""));
        const o = { text: l.text, options: { fontSize: 12, bold } };
        if (l.items[0].x - minX > 18) o.options.bullet = { indent: 14 };
        return o;
      });
      // overflow: about 24 lines fit the body box; the rest goes to speaker notes
      let notes = "";
      let shownObjs = textObjs;
      const estLines = Math.ceil(textLines.reduce((s, l) => s + l.text.length + 1, 0) / 110);
      if (estLines > 24 && textObjs.length > 4) {
        let kept = [], chars = 0;
        for (const o of textObjs) { if (chars + o.text.length > 24 * 110) break; kept.push(o); chars += o.text.length; }
        const rest = textObjs.slice(kept.length);
        if (rest.length) { notes = rest.map((o) => o.text).join("\n"); shownObjs = kept; notesCount++; }
      }
      let bodyY = 1.1, bodyH = 5.6;
      if (emittedTables.length) {
        const tb = emittedTables[0];
        const rows = tb.rows.map((row, ri) => row.map((c) => ({ text: c ? c.text : "", options: { bold: ri === 0, fontSize: 10 } })));
        const colCount = Math.max.apply(null, tb.rows.map((r) => r.length));
        const tableH = Math.min(3.5, tb.rows.length * 0.32);
        slide.addTable(rows, { x: 0.5, y: 1.1, w: 12.33, colW: 12.33 / colCount, fontSize: 10, border: { pt: 0.5, color: "999999" } });
        tableCount++;
        bodyY = 1.1 + tableH + 0.2; bodyH = Math.max(1, 6.8 - bodyY);
      }
      if (shownObjs.length) slide.addText(shownObjs, { x: 0.5, y: bodyY, w: 12.33, h: bodyH, fontSize: 12, valign: "top" });
      else if (!emittedTables.length) slide.addText("(no text on this page)", { x: 0.5, y: bodyY, w: 12.33, h: bodyH, fontSize: 12 });
      if (notes) slide.addNotes(notes);
      // images at their PDF positions (scaled to the 13.33 x 7.5 slide);
      // anything that would cover the title or body text is stacked below instead
      const pageSize = (tablePages && tablePages.find((p) => p.page === pg.page)) || { width: 612, height: 792 };
      let imgSlot = 0;
      for (const im of (images || []).filter((x) => x.page === pg.page)) {
        const dataUrl = await blobToDataUrl(im.blob);
        if (!im.place) { // no position found: keep it, stacked below the text
          const dims = await imageBlobDimensions(im.blob);
          const h = dims ? Math.min(1.5, 3 * dims.height / dims.width) : 1.5;
          slide.addImage({ data: dataUrl, x: 0.5 + imgSlot * 0.2, y: 5.8, w: 3, h });
          imageCount++; imgSlot++;
          continue;
        }
        const sx = 13.33 / pageSize.width, sy = 7.5 / pageSize.height;
        let x = im.place.x * sx, y = (pageSize.height - im.place.y - im.place.h) * sy, w = im.place.w * sx, h = im.place.h * sy;
        if (y < 5.6 && y + h > 1.1) { x = 0.5 + imgSlot * 0.2; y = 5.8; w = Math.min(w, 3); h = w * (im.place.h / im.place.w); }
        slide.addImage({ data: dataUrl, x, y, w, h });
        imageCount++; imgSlot++;
      }
    }
    await pptx.writeFile({ fileName: "ak-premium-pdf-to-ppt.pptx" });
    setStatus("pdfPptStatus", "Done. Presentation file downloaded (" + layout.length + " slide(s), " + tableCount + " table(s), " + imageCount + " image(s)" + (notesCount ? ", " + notesCount + " slide(s) with extra text moved to speaker notes" : "") + "). Open it in PowerPoint or Google Slides to check the layout.");
  } catch (e) { if (!setPdfError("pdfPptStatus", e)) setError("pdfPptStatus", "Could not convert this PDF to PPT."); }
});

/* Shared engine: plain text (or simple HTML with tags stripped) to a
   paginated 12-point PDF. Used by TXT / HTML to PDF and by the HTML to
   PDF landing page. Takes no element ids, so it splits to core.js. */
